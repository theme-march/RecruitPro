import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { User, UserRole } from '../types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await query<User[]>('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password || '');
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register (Admin only can create users)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result: any = await query<any>(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    if (role === 'agent') {
      await query('INSERT INTO agents (user_id) VALUES (?)', [result.insertId]);
    }

    res.status(201).json({ message: 'User created successfully', id: result.insertId });
  } catch (error: any) {
    console.error('Register Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
});

// Get all users (Super Admin only) with pagination/search
router.get('/users', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can view all users' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim();
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];
    if (search) {
      whereClause = 'WHERE name LIKE ? OR email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    const dataQuery = `SELECT id, name, email, role, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const users = await query<User[]>(dataQuery, [...params, limit, offset]);

    const countQuery = `SELECT COUNT(*) as cnt FROM users ${whereClause}`;
    const countResult: any = await query<any>(countQuery, params);
    const total = countResult[0]?.cnt || 0;

    res.json({ data: users, total, page, limit });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user role (Super Admin only)
router.put('/users/:id/role', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can change user roles' });
    }

    const { id } = req.params;
    const { newRole } = req.body;
    const validRoles: UserRole[] = ['super_admin', 'admin', 'agent', 'accountant', 'data_entry'];

    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Prevent self-demotion
    if (parseInt(id) === req.user.id && newRole !== 'super_admin') {
      return res.status(400).json({ message: 'Cannot demote yourself' });
    }

    const updated = await query<any>(
      'UPDATE users SET role = ? WHERE id = ?',
      [newRole, id]
    );

    if (updated.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

export default router;
