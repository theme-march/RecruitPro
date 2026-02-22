import express from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Candidate } from '../types';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req: express.Request, file: any, cb: (err: Error | null, dest: string) => void) => {
    cb(null, 'uploads/');
  },
  filename: (req: express.Request, file: any, cb: (err: Error | null, filename: string) => void) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

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

    if (req.user.role === 'agent') {
      baseQuery = `SELECT * FROM candidates WHERE agent_id = ?`;
      params.push(req.user.id);
    } else {
      baseQuery = `
        SELECT c.*, u.name as agent_name
        FROM candidates c
        JOIN users u ON c.agent_id = u.id
        WHERE 1=1
      `;
    }

    if (search) {
      baseQuery += ` AND (c.name LIKE ? OR c.passport_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const dataQuery = `${baseQuery} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query<any>(dataQuery, [...params, limit, offset]);

    if (req.user.role === 'agent') {
      countQuery = 'SELECT COUNT(*) as cnt FROM candidates WHERE agent_id = ?';
      if (search) {
        countQuery += ' AND (name LIKE ? OR passport_number LIKE ?)';
      }
    } else {
      countQuery = `
        SELECT COUNT(*) as cnt
        FROM candidates c
        JOIN users u ON c.agent_id = u.id
        WHERE 1=1
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

// Get single candidate
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const candidates: Candidate[] = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
    const candidate = candidates[0];
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(candidate);
  } catch (error) {
    console.error('Get Candidate Error:', error);
    res.status(500).json({ message: 'Failed to fetch candidate' });
  }
});

// Create candidate
router.post(
  '/',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'agent', 'data_entry'),
  upload.fields([{ name: 'passport_copy' }, { name: 'cv' }]),
  async (req: any, res) => {
    const { name, passport_number, phone, email, date_of_birth, package_amount } = req.body;
    const agent_id = req.user.role === 'agent' ? req.user.id : req.body.agent_id;

    const files = req.files as any;
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
          package_amount,
          package_amount,
          passport_copy_url,
          cv_url
        ]
      );

      res.status(201).json({ id: result.insertId });
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
  authorizeRoles('super_admin', 'admin', 'agent', 'data_entry'),
  upload.fields([{ name: 'passport_copy' }, { name: 'cv' }]),
  async (req: any, res) => {
    try {
      const { name, phone, email, date_of_birth, package_amount, status } = req.body;
      const candidateId = req.params.id;

      const candidates: Candidate[] = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ?', [candidateId]);
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only edit your own candidates' });
      }

      const files = req.files as any;
      const passport_copy_url = files?.passport_copy ? `/uploads/${files.passport_copy[0].filename}` : candidate.passport_copy_url;
      const cv_url = files?.cv ? `/uploads/${files.cv[0].filename}` : candidate.cv_url;

      let pkgAmt = candidate.package_amount;
      if (req.user.role !== 'data_entry') {
        pkgAmt = parseFloat(package_amount) || candidate.package_amount;
      }

      const newDue = pkgAmt - candidate.total_paid;

      await query(
        `UPDATE candidates
         SET name = ?, phone = ?, email = ?, date_of_birth = ?, package_amount = ?, due_amount = ?, status = ?, passport_copy_url = ?, cv_url = ?
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

      res.json({ message: 'Candidate updated' });
    } catch (error) {
      console.error('Update Candidate Error:', error);
      res.status(500).json({ message: 'Failed to update candidate' });
    }
  }
);

export default router;
