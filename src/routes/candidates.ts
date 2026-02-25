
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
      baseQuery = `SELECT c.* FROM candidates c WHERE agent_id = ?`;
      params.push(req.user.id);
    } else {
      baseQuery = `
        SELECT c.*, u.name as agent_name
        FROM candidates c
        LEFT JOIN users u ON c.agent_id = u.id
        WHERE 1=1
      `;
    }

    if (search) {
      baseQuery += ` AND (c.name LIKE ? OR c.passport_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const dataQuery = `${baseQuery} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query<any>(dataQuery, [...params, limit, offset]);

    if (isAgent) {
      countQuery = 'SELECT COUNT(*) as cnt FROM candidates c WHERE agent_id = ?';
      if (search) {
        countQuery += ' AND (c.name LIKE ? OR c.passport_number LIKE ?)';
      }
    } else {
      countQuery = `
        SELECT COUNT(*) as cnt
        FROM candidates c
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

// Get single candidate with documents
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const isAgent = req.user.role === 'agent';
    
    let queryStr = '';
    if (isAgent) {
      queryStr = 'SELECT * FROM candidates WHERE id = ?';
    } else {
      queryStr = `
        SELECT c.*, u.name as agent_name
        FROM candidates c
        LEFT JOIN users u ON c.agent_id = u.id
        WHERE c.id = ?
      `;
    }
    
    const candidates: any = await query<any>(queryStr, [req.params.id]);
    const candidate = candidates[0];
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (isAgent && candidate.agent_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
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

    res.json({
      ...candidate,
      additional_documents: documents,
      connected_employers: connectedEmployers,
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
        'SELECT * FROM candidates WHERE id = ?',
        [candidateId]
      );

      const candidate = candidates[0];

      if (!candidate) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      // ✅ Agent permission check
      if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only edit your own candidates' });
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
        'SELECT * FROM candidates WHERE id = ?',
        [candidateId]
      );
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
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
      const candidates: Candidate[] = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ?', [candidateId]);
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
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

// Reassign candidate to different agent (Admin only)
router.put(
  '/:id/assign-agent',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req: any, res) => {
    try {
      const { candidateId, newAgentId } = req.body;

      const candidates: Candidate[] = await query<Candidate[]>(
        'SELECT * FROM candidates WHERE id = ?',
        [candidateId]
      );
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      await query(
        'UPDATE candidates SET agent_id = ? WHERE id = ?',
        [newAgentId, candidateId]
      );

      res.json({ message: 'Candidate reassigned successfully' });
    } catch (error) {
      console.error('Assign Agent Error:', error);
      res.status(500).json({ message: 'Failed to reassign candidate' });
    }
  }
);

export default router;
