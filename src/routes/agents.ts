import express from 'express';
import { query, transaction } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Agent, Candidate, User } from '../types';

const router = express.Router();

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
router.get('/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const agentId = req.params.id;
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
    res.json({ agent, candidates });
  } catch (error) {
    console.error('Get Agent Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch agent details' });
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
