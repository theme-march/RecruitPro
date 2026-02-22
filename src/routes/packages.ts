import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { Package } from '../types.js';

const router = express.Router();

// Get all packages (Public) with pagination & search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim();
    const offset = (page - 1) * limit;

    let where = '';
    const params: any[] = [];
    if (search) {
      where = 'WHERE name LIKE ?';
      params.push(`%${search}%`);
    }

    const dataQuery = `SELECT id, name, amount, description, created_at FROM packages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = await query<Package[]>(dataQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) as cnt FROM packages ${where}`;
    const countResult: any = await query<any>(countQuery, params);
    const total = countResult[0]?.cnt || 0;

    res.json({ data: rows, total, page, limit });
  } catch (error) {
    console.error('Fetch packages error:', error);
    res.status(500).json({ message: 'Failed to fetch packages' });
  }
});

// Create package (Super Admin only)
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can create packages' });
    }

    const { name, amount, description } = req.body;

    if (!name || !amount) {
      return res.status(400).json({ message: 'Name and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const result: any = await query<any>(
      'INSERT INTO packages (name, amount, description) VALUES (?, ?, ?)',
      [name, parseFloat(amount), description || null]
    );

    res.status(201).json({
      message: 'Package created successfully',
      id: result.insertId,
      name,
      amount: parseFloat(amount),
      description
    });
  } catch (error: any) {
    console.error('Create package error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Package name already exists' });
    }
    res.status(500).json({ message: 'Failed to create package' });
  }
});

// Update package (Super Admin only)
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can update packages' });
    }

    const { id } = req.params;
    const { name, amount, description } = req.body;

    if (!name || !amount) {
      return res.status(400).json({ message: 'Name and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const updated = await query<any>(
      'UPDATE packages SET name = ?, amount = ?, description = ? WHERE id = ?',
      [name, parseFloat(amount), description || null, id]
    );

    if (updated.affectedRows === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.json({ message: 'Package updated successfully' });
  } catch (error: any) {
    console.error('Update package error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Package name already exists' });
    }
    res.status(500).json({ message: 'Failed to update package' });
  }
});

// Delete package (Super Admin only)
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can delete packages' });
    }

    const { id } = req.params;

    const deleted = await query<any>(
      'DELETE FROM packages WHERE id = ?',
      [id]
    );

    if (deleted.affectedRows === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ message: 'Failed to delete package' });
  }
});

export default router;
