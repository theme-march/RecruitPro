import express from 'express';
import { query, transaction } from '../db.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Candidate, Payment } from '../types';

const router = express.Router();

// Add payment
router.post(
  '/',
  authenticateToken,
  authorizeRoles('super_admin', 'admin', 'accountant', 'agent'),
  async (req: any, res) => {
    const { candidate_id, amount, payment_type, payment_method, transaction_id, notes } = req.body;

    try {
      const candidates = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ?', [candidate_id]);
      const candidate = candidates[0];
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

      if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only add payments for your own candidates' });
      }

      await transaction(async (conn) => {
        await conn.query(
          `INSERT INTO payments (candidate_id, amount, payment_type, payment_method, transaction_id, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [candidate_id, amount, payment_type, payment_method, transaction_id, notes]
        );

        const newTotalPaid = parseFloat(candidate.total_paid as any) + parseFloat(amount);
        const newDue = parseFloat(candidate.package_amount as any) - newTotalPaid;

        await conn.query(
          `UPDATE candidates SET total_paid = ?, due_amount = ? WHERE id = ?`,
          [newTotalPaid, newDue, candidate_id]
        );
      });
      res.status(201).json({ message: 'Payment recorded successfully' });
    } catch (error) {
      console.error('Add Payment Error:', error);
      res.status(500).json({ message: 'Transaction failed' });
    }
  }
);

// Get payments for a candidate
router.get('/candidate/:id', authenticateToken, async (req: any, res) => {
  try {
    const candidateId = req.params.id;
    const candidates = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ?', [candidateId]);
    const candidate = candidates[0];
    if (req.user.role === 'agent' && candidate.agent_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const payments = await query<Payment[]> (
      'SELECT * FROM payments WHERE candidate_id = ? ORDER BY created_at DESC',
      [candidateId]
    );
    res.json(payments);
  } catch (error) {
    console.error('Get Payments Error:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

// Get payment by transaction ID
router.get('/transaction/:tranId', authenticateToken, async (req: any, res) => {
  const { tranId } = req.params;
  console.log(`Fetching payment for tranId: ${tranId}, User: ${req.user.email} (${req.user.role})`);
  try {
    const rows = await query<(Payment & { candidate_name: string; candidate_phone: string; candidate_email: string })[]>(
      `SELECT p.*, c.name as candidate_name, c.phone as candidate_phone, c.email as candidate_email
       FROM payments p
       JOIN candidates c ON p.candidate_id = c.id
       WHERE p.transaction_id = ?`,
      [tranId]
    );

    const payment = rows[0];
    if (!payment) {
      console.warn(`Payment not found for tranId: ${tranId}`);
      return res.status(404).json({ message: 'Payment record not found in database' });
    }

    if (req.user.role === 'agent') {
      const candRows = await query<{ agent_id: number }[]>(
        'SELECT agent_id FROM candidates WHERE id = ?',
        [payment.candidate_id]
      );
      if ((candRows as { agent_id: number }[])[0]?.agent_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to access this receipt' });
      }
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment transaction:', error);
    res.status(500).json({ message: 'Internal server error while fetching payment details' });
  }
});

export default router;
