
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Candidate } from '../types';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req: express.Request, file: any, cb: (err: Error | null, dest: string) => void) => {
    cb(null, 'uploads/');
  },
  filename: (req: express.Request, file: any, cb: (err: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and document files are allowed!'));
    }
  }
});

// Get all candidates with pagination/search
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim();
    const offset = (page - 1) * limit;

    let baseQuery = '';
    let params: any[] = [];
    let countQuery = '';

    const isAgent = req.user.role === 'agent';

    if (isAgent) {
      baseQuery = `
        SELECT DISTINCT c.*
        FROM candidates c
        JOIN candidate_agents ca ON ca.candidate_id = c.id
        WHERE ca.agent_id = ? AND c.is_deleted = 0
      `;
      params.push(req.user.id);
    } else {
      baseQuery = `
        SELECT
          c.*,
          u.name as agent_name,
          ec.employer_id as connected_employer_id,
          e.company_name as connected_employer_name
        FROM candidates c
        LEFT JOIN users u ON c.agent_id = u.id AND u.is_deleted = 0
        LEFT JOIN (
          SELECT candidate_id, MIN(employer_id) as employer_id
          FROM employer_candidates
          GROUP BY candidate_id
        ) ec ON ec.candidate_id = c.id
        LEFT JOIN employers e ON e.id = ec.employer_id AND e.is_deleted = 0
        WHERE c.is_deleted = 0
      `;
    }

    if (search) {
      baseQuery += ` AND (c.name LIKE ? OR c.passport_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const dataQuery = `${baseQuery} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query<any>(dataQuery, [...params, limit, offset]);

    if (isAgent) {
      countQuery = `
        SELECT COUNT(DISTINCT c.id) as cnt
        FROM candidates c
        JOIN candidate_agents ca ON ca.candidate_id = c.id
        WHERE ca.agent_id = ? AND c.is_deleted = 0
      `;
      if (search) {
        countQuery += ' AND (c.name LIKE ? OR c.passport_number LIKE ?)';
      }
    } else {
      countQuery = `
        SELECT COUNT(*) as cnt
        FROM candidates c
        WHERE c.is_deleted = 0
      `;
      if (search) {
        countQuery += ' AND (c.name LIKE ? OR c.passport_number LIKE ?)';
      }
    }

    const countResult: any = await query<any>(countQuery, params);
    const total = countResult[0]?.cnt || 0;

    res.json({ data: rows, total, page, limit });
  } catch (error) {
    console.error('Get Candidates Error:', error);
    res.status(500).json({ message: 'Failed to fetch candidates' });
  }
});

// Get single candidate with documents
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const isAgent = req.user.role === 'agent';
    
    let queryStr = '';
    if (isAgent) {
      queryStr = 'SELECT * FROM candidates WHERE id = ? AND is_deleted = 0';
    } else {
      queryStr = `
        SELECT c.*, u.name as agent_name
        FROM candidates c
        LEFT JOIN users u ON c.agent_id = u.id AND u.is_deleted = 0
        WHERE c.id = ? AND c.is_deleted = 0
      `;
    }
    
    const candidates: any = await query<any>(queryStr, [req.params.id]);
    const candidate = candidates[0];
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (isAgent) {
      const accessRows: any = await query(
        'SELECT id FROM candidate_agents WHERE candidate_id = ? AND agent_id = ? LIMIT 1',
        [req.params.id, req.user.id]
      );
      if (!accessRows.length) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // Get additional documents
    const documents = await query<any>(
      'SELECT * FROM candidate_documents WHERE candidate_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    const connectedEmployers = await query<any[]>(
      `SELECT e.id, e.company_name, e.country, e.industry, ec.position, ec.salary, ec.status, ec.joining_date, ec.created_at as connection_date
       FROM employer_candidates ec
       JOIN employers e ON ec.employer_id = e.id
       WHERE ec.candidate_id = ?
       ORDER BY ec.created_at DESC`,
      [req.params.id]
    );

    const connectedAgents = await query<any[]>(
      `SELECT u.id, u.name, u.email, ca.created_at as connection_date
       FROM candidate_agents ca
       JOIN users u ON u.id = ca.agent_id AND u.is_deleted = 0
       WHERE ca.candidate_id = ?
       ORDER BY ca.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...candidate,
      additional_documents: documents,
      connected_employers: connectedEmployers,
      connected_agents: connectedAgents,
    });
  } catch (error) {
    console.error('Get Candidate Error:', error);
    res.status(500).json({ message: 'Failed to fetch candidate' });
  }
});

// Create candidate
router.post(
  '/',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'data_entry'),
  upload.fields([
    { name: 'passport_copy' }, 
    { name: 'cv' }, 
    { name: 'others', maxCount: 10 }
  ]),
  async (req: any, res) => {
    const { name, passport_number, phone, email, date_of_birth, package_amount, employer_id } = req.body;
    const agent_id =
      req.user.role === 'agent'
        ? req.user.id
        : req.body.agent_id
          ? parseInt(req.body.agent_id, 10)
          : null;

    const files = req.files as any;
    const safePackageAmount = Number(package_amount) || 0;
    const passport_copy_url = files?.passport_copy ? `/uploads/${files.passport_copy[0].filename}` : null;
    const cv_url = files?.cv ? `/uploads/${files.cv[0].filename}` : null;

    try {
      const result = await query<any>(
        `INSERT INTO candidates (agent_id, name, passport_number, phone, email, date_of_birth, package_amount, due_amount, passport_copy_url, cv_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agent_id,
          name,
          passport_number,
          phone,
          email,
          date_of_birth,
          safePackageAmount,
          safePackageAmount,
          passport_copy_url,
          cv_url
        ]
      );

      const candidateId = result.insertId;
      if (agent_id) {
        await query(
          'INSERT IGNORE INTO candidate_agents (candidate_id, agent_id) VALUES (?, ?)',
          [candidateId, agent_id]
        );
      }

      // If employer selected in Add Candidate form, create candidate-employer link
      if (employer_id) {
        const employerIdNum = parseInt(employer_id, 10);
        if (!isNaN(employerIdNum) && employerIdNum > 0) {
          await query(
            `INSERT INTO employer_candidates (employer_id, candidate_id, position, salary, joining_date)
             VALUES (?, ?, NULL, ?, NULL)
             ON DUPLICATE KEY UPDATE salary = VALUES(salary)`,
            [employerIdNum, candidateId, safePackageAmount]
          );
        }
      }

      // Save additional documents
      if (files?.others && files.others.length > 0) {
        for (const file of files.others) {
          await query(
            `INSERT INTO candidate_documents (candidate_id, document_name, document_url, file_size, mime_type, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              candidateId,
              file.originalname,
              `/uploads/${file.filename}`,
              file.size,
              file.mimetype,
              req.user.id
            ]
          );
        }
      }

      res.status(201).json({ id: candidateId });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Passport number already exists' });
      }
      console.error('Create Candidate Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update candidate
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'data_entry'),
  upload.fields([
    { name: 'passport_copy' }, 
    { name: 'cv' }, 
    { name: 'others', maxCount: 10 }
  ]),
  async (req: any, res) => {
    try {
      const candidateId = req.params.id;

      const { name, phone, email, date_of_birth, package_amount, status } = req.body;

      // ✅ Get candidate
      const candidates: any = await query(
        'SELECT * FROM candidates WHERE id = ? AND is_deleted = 0',
        [candidateId]
      );

      const candidate = candidates[0];

      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      // ✅ Agent permission check
      if (req.user.role === 'agent') {
        const accessRows: any = await query(
          'SELECT id FROM candidate_agents WHERE candidate_id = ? AND agent_id = ? LIMIT 1',
          [candidateId, req.user.id]
        );
        if (!accessRows.length) {
          return res.status(403).json({ message: 'Forbidden: You can only edit your own candidates' });
        }
      }

      const files = req.files as any;

      const passport_copy_url = files?.passport_copy
        ? `/uploads/${files.passport_copy[0].filename}`
        : candidate.passport_copy_url;

      const cv_url = files?.cv
        ? `/uploads/${files.cv[0].filename}`
        : candidate.cv_url;

      // ✅ Safe package amount
      let pkgAmt = Number(candidate.package_amount) || 0;

      if (req.user.role !== 'data_entry') {
        const parsedAmount = Number(package_amount);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          pkgAmt = parsedAmount;
        }
      }

      // ✅ Safe total_paid
      const totalPaid = Number(candidate.total_paid) || 0;

      // ✅ Safe due calculation
      const newDue = pkgAmt - totalPaid;

      console.log({
        pkgAmt,
        totalPaid,
        newDue
      });

      await query(
        `UPDATE candidates
         SET name = ?, 
             phone = ?, 
             email = ?, 
             date_of_birth = ?, 
             package_amount = ?, 
             due_amount = ?, 
             status = ?, 
             passport_copy_url = ?, 
             cv_url = ?
         WHERE id = ?`,
        [
          name || candidate.name,
          phone || candidate.phone,
          email || candidate.email,
          date_of_birth || candidate.date_of_birth,
          pkgAmt,
          newDue,
          status || candidate.status,
          passport_copy_url,
          cv_url,
          candidateId
        ]
      );

      // ✅ Save additional documents safely
      if (files?.others && files.others.length > 0) {
        for (const file of files.others) {
          await query(
            `INSERT INTO candidate_documents 
            (candidate_id, document_name, document_url, file_size, mime_type, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              candidateId,
              file.originalname,
              `/uploads/${file.filename}`,
              file.size,
              file.mimetype,
              req.user.id
            ]
          );
        }
      }

      res.json({ message: 'Candidate updated successfully' });

    } catch (error: any) {
      console.error('Update Candidate Error:', error);
      res.status(500).json({ message: error.message || 'Failed to update candidate' });
    }
  }
);
// Delete additional document
router.post(
  '/:id/documents',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'agent'),
  upload.single('document'),
  async (req: any, res) => {
    try {
      const candidateId = req.params.id;

      const candidates: Candidate[] = await query<Candidate[]>(
        'SELECT * FROM candidates WHERE id = ? AND is_deleted = 0',
        [candidateId]
      );
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (req.user.role === 'agent') {
        const accessRows: any = await query(
          'SELECT id FROM candidate_agents WHERE candidate_id = ? AND agent_id = ? LIMIT 1',
          [candidateId, req.user.id]
        );
        if (!accessRows.length) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      await query(
        `INSERT INTO candidate_documents (candidate_id, document_name, document_url, file_size, mime_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          candidateId,
          req.file.originalname,
          `/uploads/${req.file.filename}`,
          req.file.size,
          req.file.mimetype,
          req.user.id
        ]
      );

      res.json({ message: 'Document uploaded successfully' });
    } catch (error) {
      console.error('Upload Candidate Document Error:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  }
);

// Delete additional document
router.delete(
  '/:candidateId/documents/:documentId',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req: any, res) => {
    try {
      const { candidateId, documentId } = req.params;

      // Check if candidate belongs to agent
      const candidates: Candidate[] = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ? AND is_deleted = 0', [candidateId]);
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (req.user.role === 'agent') {
        const accessRows: any = await query(
          'SELECT id FROM candidate_agents WHERE candidate_id = ? AND agent_id = ? LIMIT 1',
          [candidateId, req.user.id]
        );
        if (!accessRows.length) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      // Get document info
      const documents: any = await query<any>(
        'SELECT * FROM candidate_documents WHERE id = ? AND candidate_id = ?',
        [documentId, candidateId]
      );
      const document = documents[0];
      if (!document) return res.status(404).json({ message: 'Document not found' });

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), document.document_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await query('DELETE FROM candidate_documents WHERE id = ?', [documentId]);

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete Document Error:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  }
);

// Soft delete candidate
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'agent'),
  async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.id, 10);
      if (Number.isNaN(candidateId)) {
        return res.status(400).json({ message: 'Invalid candidate id' });
      }

      const candidates: any = await query(
        'SELECT id FROM candidates WHERE id = ? AND is_deleted = 0',
        [candidateId]
      );
      if (!candidates.length) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      if (req.user.role === 'agent') {
        const accessRows: any = await query(
          'SELECT id FROM candidate_agents WHERE candidate_id = ? AND agent_id = ? LIMIT 1',
          [candidateId, req.user.id]
        );
        if (!accessRows.length) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      await query(
        'UPDATE candidates SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0',
        [candidateId]
      );

      res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
      console.error('Delete Candidate Error:', error);
      res.status(500).json({ message: 'Failed to delete candidate' });
    }
  }
);

// Reassign candidate to different agent (Admin only)
router.put(
  '/:id/assign-agent',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.id || req.body?.candidateId, 10);
      const newAgentId = parseInt(req.body?.newAgentId, 10);

      if (Number.isNaN(candidateId) || Number.isNaN(newAgentId)) {
        return res.status(400).json({ message: 'Candidate and agent are required' });
      }

      const candidates: Candidate[] = await query<Candidate[]>(
        'SELECT * FROM candidates WHERE id = ? AND is_deleted = 0',
        [candidateId]
      );
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (candidate.agent_id) {
        if (Number(candidate.agent_id) === newAgentId) {
          return res.json({ message: 'Candidate already assigned to this agent' });
        }

        const currentAgentRows: any = await query(
          'SELECT name FROM users WHERE id = ? LIMIT 1',
          [candidate.agent_id]
        );
        const currentAgentName = currentAgentRows[0]?.name || 'current agent';
        return res.status(400).json({
          message: `Candidate already assigned to ${currentAgentName}. A candidate cannot be added to another agent.`,
        });
      }

      const existingAgentRows: any = await query(
        'SELECT agent_id FROM candidate_agents WHERE candidate_id = ? LIMIT 1',
        [candidateId]
      );
      if (existingAgentRows.length) {
        return res.status(400).json({
          message: 'Candidate already has an agent connection. A candidate cannot be added to another agent.',
        });
      }

      await query(
        'INSERT IGNORE INTO candidate_agents (candidate_id, agent_id) VALUES (?, ?)',
        [candidateId, newAgentId]
      );
      await query(
        'UPDATE candidates SET agent_id = ? WHERE id = ?',
        [newAgentId, candidateId]
      );

      res.json({ message: 'Candidate assigned successfully' });
    } catch (error) {
      console.error('Assign Agent Error:', error);
      res.status(500).json({ message: 'Failed to reassign candidate' });
    }
  }
);

// Disconnect an agent from a candidate (Admin only)
router.delete(
  '/:candidateId/agents/:agentId',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId, 10);
      const agentId = parseInt(req.params.agentId, 10);

      if (Number.isNaN(candidateId) || Number.isNaN(agentId)) {
        return res.status(400).json({ message: 'Invalid candidate or agent id' });
      }

      const candidateRows: any = await query(
        'SELECT id, agent_id FROM candidates WHERE id = ? AND is_deleted = 0',
        [candidateId]
      );
      const candidate = candidateRows[0];
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      const relationRows: any = await query(
        'SELECT id FROM candidate_agents WHERE candidate_id = ? AND agent_id = ? LIMIT 1',
        [candidateId, agentId]
      );
      if (!relationRows.length) {
        return res.status(404).json({ message: 'Agent is not connected to this candidate' });
      }

      const allAgentRows: any = await query(
        'SELECT agent_id FROM candidate_agents WHERE candidate_id = ? ORDER BY created_at ASC',
        [candidateId]
      );

      await query(
        'DELETE FROM candidate_agents WHERE candidate_id = ? AND agent_id = ?',
        [candidateId, agentId]
      );

      // Keep employer links in sync: when agent-candidate relation is removed,
      // remove candidate from employers connected through that agent.
      const affectedEmployers: any = await query(
        `SELECT DISTINCT ec.employer_id
         FROM employer_candidates ec
         JOIN employer_agents ea
           ON ea.employer_id = ec.employer_id
          AND ea.agent_id = ?
         WHERE ec.candidate_id = ?`,
        [agentId, candidateId]
      );

      await query(
        `DELETE ec
         FROM employer_candidates ec
         JOIN employer_agents ea
           ON ea.employer_id = ec.employer_id
          AND ea.agent_id = ?
         WHERE ec.candidate_id = ?`,
        [agentId, candidateId]
      );

      // If that employer has no remaining candidates for this agent,
      // disconnect the agent from that employer as well.
      for (const row of affectedEmployers) {
        const employerId = Number(row.employer_id);
        const remainingRows: any = await query(
          `SELECT COUNT(*) as count
           FROM employer_candidates ec
           JOIN candidate_agents ca ON ca.candidate_id = ec.candidate_id
           WHERE ec.employer_id = ? AND ca.agent_id = ?`,
          [employerId, agentId]
        );
        if ((remainingRows[0]?.count || 0) === 0) {
          await query(
            'DELETE FROM employer_agents WHERE employer_id = ? AND agent_id = ?',
            [employerId, agentId]
          );
        }
      }

      if (Number(candidate.agent_id) === agentId) {
        const remainingRows: any = await query(
          'SELECT agent_id FROM candidate_agents WHERE candidate_id = ? ORDER BY created_at ASC LIMIT 1',
          [candidateId]
        );
        const nextAgentId = remainingRows[0]?.agent_id;
        if (nextAgentId) {
          await query(
            'UPDATE candidates SET agent_id = ? WHERE id = ?',
            [nextAgentId, candidateId]
          );
        } else {
          await query(
            'UPDATE candidates SET agent_id = NULL WHERE id = ?',
            [candidateId]
          );
        }
      }

      res.json({ message: 'Agent disconnected from candidate successfully' });
    } catch (error) {
      console.error('Disconnect Candidate Agent Error:', error);
      res.status(500).json({ message: 'Failed to disconnect agent from candidate' });
    }
  }
);

export default router;
