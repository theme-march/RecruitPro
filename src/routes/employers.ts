import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

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

    let baseQuery = 'SELECT * FROM employers WHERE 1=1';
    let params: any[] = [];

    if (search) {
      baseQuery += ' AND (company_name LIKE ? OR country LIKE ? OR industry LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const dataQuery = `${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const employers = await query<any>(dataQuery, [...params, limit, offset]);

    const countQuery = 'SELECT COUNT(*) as cnt FROM employers WHERE 1=1' + 
      (search ? ' AND (company_name LIKE ? OR country LIKE ? OR industry LIKE ?)' : '');
    const countResult: any = await query<any>(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);
    const total = countResult[0]?.cnt || 0;

    res.json({ data: employers, total, page, limit });
  } catch (error) {
    console.error('Get Employers Error:', error);
    res.status(500).json({ message: 'Failed to fetch employers' });
  }
});

// Get employers connected to an agent
router.get('/agent/:agentId', authenticateToken, async (req: any, res) => {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    if (Number.isNaN(agentId)) return res.status(400).json({ message: 'Invalid agent id' });

    if (req.user.role === 'agent' && req.user.id !== agentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const employers = await query(
      `SELECT e.id, e.company_name, e.country, e.industry, ea.status, ea.created_at as connection_date
       FROM employer_agents ea
       JOIN employers e ON ea.employer_id = e.id
       WHERE ea.agent_id = ?
       ORDER BY ea.created_at DESC`,
      [agentId]
    );

    res.json({ data: employers });
  } catch (error) {
    console.error('Get Agent Connected Employers Error:', error);
    res.status(500).json({ message: 'Failed to fetch connected employers' });
  }
});

// Get employers connected to a candidate
router.get('/candidate/:candidateId', authenticateToken, async (req: any, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);
    if (Number.isNaN(candidateId)) return res.status(400).json({ message: 'Invalid candidate id' });

    if (req.user.role === 'agent') {
      const candidates: any = await query('SELECT id, agent_id FROM candidates WHERE id = ?', [candidateId]);
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
      if (candidate.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const employers = await query(
      `SELECT e.id, e.company_name, e.country, e.industry, ec.position, ec.salary, ec.status, ec.joining_date, ec.created_at as connection_date
       FROM employer_candidates ec
       JOIN employers e ON ec.employer_id = e.id
       WHERE ec.candidate_id = ?
       ORDER BY ec.created_at DESC`,
      [candidateId]
    );

    res.json({ data: employers });
  } catch (error) {
    console.error('Get Candidate Connected Employers Error:', error);
    res.status(500).json({ message: 'Failed to fetch connected employers' });
  }
});

// Get single employer
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const employerId = req.params.id;
    const employers: any = await query('SELECT * FROM employers WHERE id = ?', [employerId]);
    const employer = employers[0];
    if (!employer) return res.status(404).json({ message: 'Employer not found' });

    const agents = await query(`SELECT u.id, u.name, u.email, ea.status, ea.created_at as connection_date FROM employer_agents ea JOIN users u ON ea.agent_id = u.id WHERE ea.employer_id = ?`, [employerId]);
    const candidates = await query(`SELECT c.id, c.name, c.passport_number, c.phone, c.package_amount, ec.position, ec.salary, ec.status, ec.joining_date FROM employer_candidates ec JOIN candidates c ON ec.candidate_id = c.id WHERE ec.employer_id = ?`, [employerId]);
    const documents = await query(`SELECT * FROM employer_documents WHERE employer_id = ? ORDER BY created_at DESC`, [employerId]);

    res.json({ ...employer, connected_agents: agents, connected_candidates: candidates, documents: documents });
  } catch (error) {
    console.error('Get Employer Error:', error);
    res.status(500).json({ message: 'Failed to fetch employer' });
  }
});

// Create employer
router.post('/', authenticateToken, authorizeRoles('super_admin', 'admin'), upload.single('logo'), async (req: any, res) => {
  try {
    const { company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, description } = req.body;
    const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await query(`INSERT INTO employers (company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, logo_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, logo_url, description]);

    res.status(201).json({ id: (result as any).insertId, message: 'Employer created successfully' });
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

    const employers: any = await query('SELECT * FROM employers WHERE id = ?', [employerId]);
    if (employers.length === 0) return res.status(404).json({ message: 'Employer not found' });

    const logo_url = req.file ? `/uploads/${req.file.filename}` : employers[0].logo_url;

    await query(`UPDATE employers SET company_name = ?, company_address = ?, contact_person = ?, contact_email = ?, contact_phone = ?, country = ?, industry = ?, website = ?, logo_url = ?, description = ? WHERE id = ?`, [company_name, company_address, contact_person, contact_email, contact_phone, country, industry, website, logo_url, description, employerId]);

    res.json({ message: 'Employer updated successfully' });
  } catch (error) {
    console.error('Update Employer Error:', error);
    res.status(500).json({ message: 'Failed to update employer' });
  }
});

// Connect agent to employer
router.post('/:id/connect-agent', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const { employerId, agentId } = req.body;
    await query('INSERT INTO employer_agents (employer_id, agent_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status = "active"', [employerId, agentId]);
    res.json({ message: 'Agent connected successfully' });
  } catch (error) {
    console.error('Connect Agent Error:', error);
    res.status(500).json({ message: 'Failed to connect agent' });
  }
});

// Connect candidate to employer
router.post('/:id/connect-candidate', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const { employerId, candidateId, position, package_amount, joining_date } = req.body;
    const packageAmount = parseFloat(package_amount || "0");

    const candidates: any = await query('SELECT id, total_paid, package_amount FROM candidates WHERE id = ?', [candidateId]);
    const candidate = candidates[0];
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const totalPaid = parseFloat(candidate.total_paid || 0);
    const finalPackageAmount = Number.isFinite(packageAmount) && packageAmount > 0
      ? packageAmount
      : parseFloat(candidate.package_amount || 0);
    const dueAmount = Math.max(0, finalPackageAmount - totalPaid);

    await query(
      'UPDATE candidates SET package_amount = ?, due_amount = ? WHERE id = ?',
      [finalPackageAmount, dueAmount, candidateId]
    );

    await query(
      `INSERT INTO employer_candidates (employer_id, candidate_id, position, salary, joining_date)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE position = ?, salary = ?, joining_date = ?`,
      [employerId, candidateId, position, finalPackageAmount, joining_date, position, finalPackageAmount, joining_date]
    );
    res.json({ message: 'Candidate connected successfully' });
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

    const documents = await query(`SELECT ed.*, e.company_name FROM employer_documents ed JOIN employers e ON ed.employer_id = e.id WHERE (ed.target_type = 'agent' AND ed.target_id = ?) OR (ed.target_type = 'all' AND ed.employer_id IN (SELECT employer_id FROM employer_agents WHERE agent_id = ?)) ORDER BY ed.created_at DESC`, [agentId, agentId]);

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

    const documents = await query(`SELECT ed.*, e.company_name FROM employer_documents ed JOIN employers e ON ed.employer_id = e.id WHERE (ed.target_type = 'candidate' AND ed.target_id = ?) OR (ed.target_type = 'all' AND ed.employer_id IN (SELECT employer_id FROM employer_candidates WHERE candidate_id = ?)) ORDER BY ed.created_at DESC`, [candidateId, candidateId]);

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

// Disconnect agent from employer
router.delete('/:employerId/agents/:agentId', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    await query('DELETE FROM employer_agents WHERE employer_id = ? AND agent_id = ?', [req.params.employerId, req.params.agentId]);
    res.json({ message: 'Agent disconnected successfully' });
  } catch (error) {
    console.error('Disconnect Agent Error:', error);
    res.status(500).json({ message: 'Failed to disconnect agent' });
  }
});

// Disconnect candidate from employer
router.delete('/:employerId/candidates/:candidateId', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    await query('DELETE FROM employer_candidates WHERE employer_id = ? AND candidate_id = ?', [req.params.employerId, req.params.candidateId]);
    res.json({ message: 'Candidate disconnected successfully' });
  } catch (error) {
    console.error('Disconnect Candidate Error:', error);
    res.status(500).json({ message: 'Failed to disconnect candidate' });
  }
});

export default router;
