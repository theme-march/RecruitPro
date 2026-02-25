import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query, transaction } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Agent, Candidate, User } from '../types';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
    return cb(new Error('Only images, PDFs, and document files are allowed!'));
  }
});

// Get all agents with optional pagination & search
router.get(
  '/',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'data_entry'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string || '').trim();
      const offset = (page - 1) * limit;

      let whereClause = "WHERE u.role = 'agent'";
      const params: any[] = [];

      if (search) {
        whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const dataQuery = `
        SELECT u.id, u.name, u.email, a.phone, a.address, a.commission_rate,
               (SELECT COUNT(*) FROM candidates WHERE agent_id = u.id) as candidate_count
        FROM users u
        JOIN agents a ON u.id = a.user_id
        ${whereClause}
        ORDER BY u.name ASC
        LIMIT ? OFFSET ?
      `;

      const countQuery = `SELECT COUNT(*) as cnt FROM users u JOIN agents a ON u.id = a.user_id ${whereClause}`;

      const rows = await query<any>(dataQuery, [...params, limit, offset]);
      const countResult: any = await query<any>(countQuery, params);
      const total = countResult[0]?.cnt || 0;

      res.json({ data: rows, total, page, limit });
    } catch (error) {
      console.error('Get Agents Error:', error);
      res.status(500).json({ message: 'Failed to fetch agents' });
    }
  }
);


// Get agent details and their candidates
router.get('/:id', authenticateToken, authorizeRoles('super_admin', 'admin', 'agent'), async (req: any, res) => {
  try {
    const agentId = req.params.id;
    if (req.user.role === 'agent' && req.user.id !== parseInt(agentId, 10)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const agentRows = await query<any>(
      `SELECT u.id, u.name, u.email, a.phone, a.address, a.commission_rate
       FROM users u
       LEFT JOIN agents a ON u.id = a.user_id
       WHERE u.id = ? AND u.role = 'agent'`,
      [agentId]
    );

    const agent = agentRows[0];
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    const candidates = await query<Candidate[]>('SELECT * FROM candidates WHERE agent_id = ?', [agentId]);
    const connectedEmployers = await query<any[]>(
      `SELECT e.id, e.company_name, e.country, e.industry, ea.status, ea.created_at as connection_date
       FROM employer_agents ea
       JOIN employers e ON ea.employer_id = e.id
       WHERE ea.agent_id = ?
       ORDER BY ea.created_at DESC`,
      [agentId]
    );

    res.json({ agent, candidates, connected_employers: connectedEmployers });
  } catch (error) {
    console.error('Get Agent Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch agent details' });
  }
});

// Get additional documents for agent profile
router.get('/:id/documents', authenticateToken, authorizeRoles('super_admin', 'admin', 'agent'), async (req: any, res) => {
  try {
    const agentId = parseInt(req.params.id, 10);
    if (Number.isNaN(agentId)) return res.status(400).json({ message: 'Invalid agent ID' });

    if (req.user.role === 'agent' && req.user.id !== agentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const documents = await query<any[]>(
      'SELECT * FROM agent_documents WHERE agent_id = ? ORDER BY created_at DESC',
      [agentId]
    );

    res.json(documents);
  } catch (error) {
    console.error('Get Agent Documents Error:', error);
    res.status(500).json({ message: 'Failed to fetch agent documents' });
  }
});

// Upload additional document for agent profile
router.post('/:id/documents', authenticateToken, authorizeRoles('super_admin', 'admin', 'agent'), upload.single('document'), async (req: any, res) => {
  try {
    const agentId = parseInt(req.params.id, 10);
    if (Number.isNaN(agentId)) return res.status(400).json({ message: 'Invalid agent ID' });

    if (req.user.role === 'agent' && req.user.id !== agentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    await query(
      `INSERT INTO agent_documents (agent_id, document_name, document_url, file_size, mime_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [agentId, req.file.originalname, `/uploads/${req.file.filename}`, req.file.size, req.file.mimetype, req.user.id]
    );

    res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Upload Agent Document Error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Delete additional document for agent profile
router.delete('/:id/documents/:documentId', authenticateToken, authorizeRoles('super_admin', 'admin', 'agent'), async (req: any, res) => {
  try {
    const agentId = parseInt(req.params.id, 10);
    const documentId = parseInt(req.params.documentId, 10);
    if (Number.isNaN(agentId) || Number.isNaN(documentId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    if (req.user.role === 'agent' && req.user.id !== agentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const docs: any = await query(
      'SELECT * FROM agent_documents WHERE id = ? AND agent_id = ?',
      [documentId, agentId]
    );
    if (docs.length === 0) return res.status(404).json({ message: 'Document not found' });

    const doc = docs[0];
    const filePath = path.join(process.cwd(), doc.document_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await query('DELETE FROM agent_documents WHERE id = ?', [documentId]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete Agent Document Error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Update agent details (Admin only)
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req: any, res) => {
  try {
    const { name, email, phone, address, commission_rate } = req.body;
    const agentId = parseInt(req.params.id);

    if (isNaN(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID' });
    }

    const agentRows = await query<User[]>('SELECT * FROM users WHERE id = ? AND role = "agent"',
      [agentId]
    );
    const agent = (agentRows as User[])[0];
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await transaction(async (conn) => {
      await conn.query('UPDATE users SET name = ?, email = ? WHERE id = ? AND role = "agent"', [
        name,
        email,
        agentId
      ]);
      await conn.query(
        'UPDATE agents SET phone = ?, address = ?, commission_rate = ? WHERE user_id = ?',
        [phone || null, address || null, parseFloat(commission_rate) || 0, agentId]
      );
    });
    res.json({ message: 'Agent updated successfully' });
  } catch (error: any) {
    console.error('Agent PUT Error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

export default router;
