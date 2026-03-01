import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();
const parseVacancies = (raw: any): Array<{ job_title: string; required_count: number }> => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v: any) => ({
        job_title: String(v?.job_title || '').trim(),
        required_count: Math.max(1, parseInt(String(v?.required_count || '1'), 10) || 1),
      }))
      .filter((v: any) => v.job_title.length > 0);
  } catch {
    return [];
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    else cb(new Error('Only images, PDFs, and document files are allowed!'));
  }
});

// Get all employers
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim();
    const offset = (page - 1) * limit;

    let baseQuery = 'SELECT * FROM employers WHERE is_deleted = 0';
    let params: any[] = [];

    if (search) {
      baseQuery += ' AND (company_name LIKE ? OR country LIKE ? OR industry LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const dataQuery = `${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const employers = await query<any>(dataQuery, [...params, limit, offset]);

    const countQuery = 'SELECT COUNT(*) as cnt FROM employers WHERE is_deleted = 0' + 
      (search ? ' AND (company_name LIKE ? OR country LIKE ? OR industry LIKE ?)' : '');
    const countResult: any = await query<any>(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);
    const total = countResult[0]?.cnt || 0;

    res.json({ data: employers, total, page, limit });
  } catch (error) {
    console.error('Get Employers Error:', error);
    res.status(500).json({ message: 'Failed to fetch employers' });
  }
});

// Get single employer
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const employerId = req.params.id;
    const employers: any = await query('SELECT * FROM employers WHERE id = ? AND is_deleted = 0', [employerId]);
    const employer = employers[0];
    if (!employer) return res.status(404).json({ message: 'Employer not found' });

    const agents = await query(`SELECT u.id, u.name, u.email, ea.status, ea.created_at as connection_date FROM employer_agents ea JOIN users u ON ea.agent_id = u.id WHERE ea.employer_id = ? AND u.is_deleted = 0`, [employerId]);
    const candidates = await query(
       `SELECT
          c.id,
          c.name,
          c.passport_number,
          c.phone,
          ec.vacancy_id,
          u.name as agent_name,
          ev.job_title as vacancy_title,
          ec.position,
         ec.salary,
         ec.status,
         ec.joining_date
       FROM employer_candidates ec
       JOIN candidates c ON ec.candidate_id = c.id
       LEFT JOIN employer_vacancies ev ON ec.vacancy_id = ev.id
       LEFT JOIN users u ON c.agent_id = u.id AND u.is_deleted = 0
       WHERE ec.employer_id = ? AND c.is_deleted = 0`,
      [employerId]
    );
    const documents = await query(`SELECT * FROM employer_documents WHERE employer_id = ? ORDER BY created_at DESC`, [employerId]);
    const vacancies = await query(
      `SELECT
         ev.id,
         ev.job_title,
         ev.required_count,
         (
           SELECT COUNT(*) FROM employer_candidates ec
           WHERE ec.vacancy_id = ev.id
         ) AS filled_count
       FROM employer_vacancies ev
       WHERE ev.employer_id = ?
       ORDER BY ev.created_at ASC`,
      [employerId]
    );

    res.json({ ...employer, connected_agents: agents, connected_candidates: candidates, documents: documents, vacancies });
  } catch (error) {
    console.error('Get Employer Error:', error);
    res.status(500).json({ message: 'Failed to fetch employer' });
  }
});

// Create employer
router.post('/', authenticateToken, authorizeRoles('super_admin', 'admin'), upload.single('logo'), async (req: any, res) => {
  try {
    const { company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, description } = req.body;
    const vacancies = parseVacancies(req.body.vacancies);
    const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await query(`INSERT INTO employers (company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, logo_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, logo_url, description]);
    const employerId = (result as any).insertId;

    for (const vacancy of vacancies) {
      await query(
        'INSERT INTO employer_vacancies (employer_id, job_title, required_count) VALUES (?, ?, ?)',
        [employerId, vacancy.job_title, vacancy.required_count]
      );
    }

    res.status(201).json({ id: employerId, message: 'Employer created successfully' });
  } catch (error) {
    console.error('Create Employer Error:', error);
    res.status(500).json({ message: 'Failed to create employer' });
  }
});

// Update employer
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), upload.single('logo'), async (req: any, res) => {
  try {
    const employerId = req.params.id;
    const { company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, description } = req.body;
    const vacancies = parseVacancies(req.body.vacancies);

    const employers: any = await query('SELECT * FROM employers WHERE id = ? AND is_deleted = 0', [employerId]);
    if (employers.length === 0) return res.status(404).json({ message: 'Employer not found' });

    const logo_url = req.file ? `/uploads/${req.file.filename}` : employers[0].logo_url;

    await query(`UPDATE employers SET company_name = ?, company_address = ?, contact_person = ?, contact_email = ?, contact_phone = ?, country = ?, industry = ?, website = ?, logo_url = ?, description = ? WHERE id = ?`, [company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, logo_url, description, employerId]);
    await query('DELETE FROM employer_vacancies WHERE employer_id = ?', [employerId]);
    for (const vacancy of vacancies) {
      await query(
        'INSERT INTO employer_vacancies (employer_id, job_title, required_count) VALUES (?, ?, ?)',
        [employerId, vacancy.job_title, vacancy.required_count]
      );
    }

    res.json({ message: 'Employer updated successfully' });
  } catch (error) {
    console.error('Update Employer Error:', error);
    res.status(500).json({ message: 'Failed to update employer' });
  }
});

// Connect candidate to employer (and auto-connect their agent)
router.post('/:id/connect-candidate', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const { employerId, candidateId, position, salary, joining_date, vacancy_id } = req.body;
    const targetEmployerId = Number(employerId || req.params.id);
    if (!targetEmployerId || Number.isNaN(targetEmployerId)) {
      return res.status(400).json({ message: 'Invalid employer id' });
    }

    // Get candidate's agent
    const candidates: any = await query('SELECT agent_id FROM candidates WHERE id = ? AND is_deleted = 0', [candidateId]);
    if (candidates.length === 0) return res.status(404).json({ message: 'Candidate not found' });
    
    const agentId = candidates[0].agent_id;
    if (!agentId) {
      return res.status(400).json({
        message: 'This candidate has no assigned agent. Please assign an agent first.',
      });
    }

    // Business rule: A candidate can be connected to only one employer.
    // Allow update if already connected to the same employer.
    const existingEmployerRows: any = await query(
      `SELECT ec.employer_id, ec.vacancy_id, e.company_name
       FROM employer_candidates ec
       JOIN employers e ON e.id = ec.employer_id
       WHERE ec.candidate_id = ? AND e.is_deleted = 0
       LIMIT 1`,
      [candidateId]
    );
    if (
      existingEmployerRows.length > 0 &&
      Number(existingEmployerRows[0].employer_id) !== targetEmployerId
    ) {
      return res.status(400).json({
        message: `Candidate already connected to ${existingEmployerRows[0].company_name}. Candidate cannot be connected to another employer.`,
      });
    }

    const vacancyCountRows: any = await query(
      'SELECT COUNT(*) as cnt FROM employer_vacancies WHERE employer_id = ?',
      [targetEmployerId]
    );
    const hasVacancySetup = (vacancyCountRows[0]?.cnt || 0) > 0;
    if (hasVacancySetup && !vacancy_id) {
      return res.status(400).json({
        message: 'Please select a vacancy/job before connecting candidate.',
      });
    }

    let safeVacancyId: number | null = null;
    if (vacancy_id) {
      const vacancyRows: any = await query(
        'SELECT id, required_count FROM employer_vacancies WHERE id = ? AND employer_id = ?',
        [vacancy_id, targetEmployerId]
      );
      if (!vacancyRows.length) {
        return res.status(400).json({ message: 'Invalid vacancy selected.' });
      }

      const filledRows: any = await query(
        'SELECT COUNT(*) as filled FROM employer_candidates WHERE vacancy_id = ?',
        [vacancy_id]
      );
      const existingConnection = existingEmployerRows[0];
      const alreadyInSameVacancy =
        !!existingConnection &&
        Number(existingConnection.employer_id) === targetEmployerId &&
        Number(existingConnection.vacancy_id || 0) === Number(vacancy_id);
      const requiredCount = Number(vacancyRows[0].required_count) || 0;
      const currentFilled = Number(filledRows[0]?.filled || 0);
      if (!alreadyInSameVacancy && requiredCount > 0 && currentFilled >= requiredCount) {
        return res.status(400).json({
          message: 'Selected vacancy is already full. Please select another vacancy.',
        });
      }
      safeVacancyId = Number(vacancy_id);
    }

    // Connect candidate
    await query(
      `INSERT INTO employer_candidates (employer_id, candidate_id, vacancy_id, position, salary, joining_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE vacancy_id = ?, position = ?, salary = ?, joining_date = ?`,
      [targetEmployerId, candidateId, safeVacancyId, position, salary, joining_date, safeVacancyId, position, salary, joining_date]
    );

    // Auto-connect agent if not already connected
    await query(
      'INSERT INTO employer_agents (employer_id, agent_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status = "active"',
      [targetEmployerId, agentId]
    );

    res.json({ message: 'Candidate connected successfully (agent auto-connected)' });
  } catch (error) {
    console.error('Connect Candidate Error:', error);
    res.status(500).json({ message: 'Failed to connect candidate' });
  }
});

// Upload employer document
router.post('/:id/upload-document', authenticateToken, authorizeRoles('super_admin', 'admin'), upload.single('document'), async (req: any, res) => {
  try {
    const employerId = req.params.id;
    const { target_type, target_id, description } = req.body;

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    await query(`INSERT INTO employer_documents (employer_id, document_name, document_url, file_size, mime_type, target_type, target_id, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [employerId, req.file.originalname, `/uploads/${req.file.filename}`, req.file.size, req.file.mimetype, target_type, target_id || null, description || null, req.user.id]);

    res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Upload Document Error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Get documents for agent
router.get('/documents/agent/:agentId', authenticateToken, async (req: any, res) => {
  try {
    const agentId = req.params.agentId;
    if (req.user.role === 'agent' && req.user.id !== parseInt(agentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const documents = await query(`SELECT ed.*, e.company_name FROM employer_documents ed JOIN employers e ON ed.employer_id = e.id WHERE e.is_deleted = 0 AND ((ed.target_type = 'agent' AND ed.target_id = ?) OR (ed.target_type = 'all' AND ed.employer_id IN (SELECT employer_id FROM employer_agents WHERE agent_id = ?))) ORDER BY ed.created_at DESC`, [agentId, agentId]);

    res.json(documents);
  } catch (error) {
    console.error('Get Agent Documents Error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Get documents for candidate
router.get('/documents/candidate/:candidateId', authenticateToken, async (req: any, res) => {
  try {
    const candidateId = req.params.candidateId;

    const documents = await query(`SELECT ed.*, e.company_name FROM employer_documents ed JOIN employers e ON ed.employer_id = e.id WHERE e.is_deleted = 0 AND ((ed.target_type = 'candidate' AND ed.target_id = ?) OR (ed.target_type = 'all' AND ed.employer_id IN (SELECT employer_id FROM employer_candidates WHERE candidate_id = ?))) ORDER BY ed.created_at DESC`, [candidateId, candidateId]);

    res.json(documents);
  } catch (error) {
    console.error('Get Candidate Documents Error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Delete employer document
router.delete('/documents/:documentId', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const documentId = req.params.documentId;

    const docs: any = await query('SELECT * FROM employer_documents WHERE id = ?', [documentId]);
    if (docs.length === 0) return res.status(404).json({ message: 'Document not found' });

    const doc = docs[0];
    const filePath = path.join(process.cwd(), doc.document_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await query('DELETE FROM employer_documents WHERE id = ?', [documentId]);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete Document Error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Disconnect agent from employer (and all their candidates)
router.delete('/:employerId/agents/:agentId', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const { employerId, agentId } = req.params;

    // First, disconnect all candidates of this agent from this employer
    await query(
      'DELETE FROM employer_candidates WHERE employer_id = ? AND candidate_id IN (SELECT id FROM candidates WHERE agent_id = ? AND is_deleted = 0)',
      [employerId, agentId]
    );

    // Then disconnect the agent
    await query('DELETE FROM employer_agents WHERE employer_id = ? AND agent_id = ?', [employerId, agentId]);

    res.json({ message: 'Agent and all their candidates disconnected successfully' });
  } catch (error) {
    console.error('Disconnect Agent Error:', error);
    res.status(500).json({ message: 'Failed to disconnect agent' });
  }
});

// Disconnect candidate from employer (and auto-disconnect agent if no more candidates)
router.delete('/:employerId/candidates/:candidateId', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const { employerId, candidateId } = req.params;

    // Get candidate's agent
    const candidates: any = await query('SELECT agent_id FROM candidates WHERE id = ? AND is_deleted = 0', [candidateId]);
    if (candidates.length === 0) return res.status(404).json({ message: 'Candidate not found' });
    
    const agentId = candidates[0].agent_id;

    // Disconnect candidate
    await query('DELETE FROM employer_candidates WHERE employer_id = ? AND candidate_id = ?', [employerId, candidateId]);

    // Check if agent has any other candidates connected to this employer
    const remainingCandidates: any = await query(
      'SELECT COUNT(*) as count FROM employer_candidates ec JOIN candidates c ON ec.candidate_id = c.id WHERE ec.employer_id = ? AND c.agent_id = ? AND c.is_deleted = 0',
      [employerId, agentId]
    );

    // If no more candidates, auto-disconnect agent
    if (remainingCandidates[0].count === 0) {
      await query('DELETE FROM employer_agents WHERE employer_id = ? AND agent_id = ?', [employerId, agentId]);
    }

    res.json({ message: 'Candidate disconnected successfully' });
  } catch (error) {
    console.error('Disconnect Candidate Error:', error);
    res.status(500).json({ message: 'Failed to disconnect candidate' });
  }
});

// Soft delete employer
router.delete('/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const employerId = parseInt(req.params.id, 10);
    if (Number.isNaN(employerId)) {
      return res.status(400).json({ message: 'Invalid employer id' });
    }

    const deleted = await query<any>(
      'UPDATE employers SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0',
      [employerId]
    );

    if (deleted.affectedRows === 0) {
      return res.status(404).json({ message: 'Employer not found' });
    }

    res.json({ message: 'Employer deleted successfully' });
  } catch (error) {
    console.error('Delete Employer Error:', error);
    res.status(500).json({ message: 'Failed to delete employer' });
  }
});

export default router;
