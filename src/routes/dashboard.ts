import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'agent') {
      const statsRows = await query<{ total_candidates: number; total_collection: number; total_due: number }[]>(
        `SELECT 
           COUNT(DISTINCT c.id) as total_candidates,
           SUM(c.total_paid) as total_collection,
           SUM(c.due_amount) as total_due
         FROM candidate_agents ca
         JOIN candidates c ON c.id = ca.candidate_id
         WHERE ca.agent_id = ?`,
        [req.user.id]
      );
      const stats = statsRows[0] || {};

      // MySQL returns DECIMAL columns as strings, convert to numbers explicitly
      res.json({
        totalCandidates: stats.total_candidates || 0,
        totalCollection: parseFloat(stats.total_collection as any) || 0,
        totalDue: parseFloat(stats.total_due as any) || 0
      });
    } else if (['super_admin', 'admin', 'accountant'].includes(req.user.role)) {
      const totalAgentsRows = await query<{ count: number }[]>("SELECT COUNT(*) as count FROM users WHERE role = 'agent' AND is_deleted = 0");
      const totalCandidatesRows = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM candidates WHERE is_deleted = 0');
      const totalEmployersRows = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM employers WHERE is_deleted = 0');
      const financialStatsRows = await query<{ total_revenue: number; total_due: number }[]>(
        'SELECT SUM(total_paid) as total_revenue, SUM(due_amount) as total_due FROM candidates WHERE is_deleted = 0'
      );

      const agentWiseReport = await query<any>(
        `SELECT u.id, u.name, COUNT(DISTINCT c.id) as candidate_count, SUM(c.total_paid) as collection
         FROM users u
         LEFT JOIN candidate_agents ca ON u.id = ca.agent_id
         LEFT JOIN candidates c ON ca.candidate_id = c.id AND c.is_deleted = 0
         WHERE u.role = 'agent' AND u.is_deleted = 0
         GROUP BY u.id`
      );

      const connectionReport = await query<any>(
        `SELECT
           u.name AS agent_name,
           c.id AS candidate_id,
           c.name AS candidate_name,
           c.passport_number,
           COALESCE(GROUP_CONCAT(DISTINCT e.company_name ORDER BY e.company_name SEPARATOR ', '), 'No Employer') AS employer_names,
           c.total_paid AS collection,
           c.due_amount AS due_amount
         FROM candidate_agents ca
         JOIN users u ON u.id = ca.agent_id AND u.is_deleted = 0
         JOIN candidates c ON c.id = ca.candidate_id AND c.is_deleted = 0
         LEFT JOIN employer_candidates ec ON ec.candidate_id = c.id
         LEFT JOIN employers e ON e.id = ec.employer_id AND e.is_deleted = 0
         GROUP BY u.id, c.id
         ORDER BY u.name ASC, c.name ASC`
      );

      const totalAgents = totalAgentsRows[0]?.count || 0;
      const totalCandidates = totalCandidatesRows[0]?.count || 0;
      const totalEmployers = totalEmployersRows[0]?.count || 0;
      const financialStats = financialStatsRows[0] || { total_revenue: 0, total_due: 0 };

      // ensure numeric values for revenue/due and also for each agent's collection
      const parsedAgentReport = agentWiseReport.map((r: any) => ({
        ...r,
        collection: parseFloat(r.collection) || 0
      }));
      const parsedConnectionReport = connectionReport.map((r: any) => ({
        ...r,
        collection: parseFloat(r.collection) || 0,
        due_amount: parseFloat(r.due_amount) || 0
      }));

      res.json({
        totalAgents,
        totalCandidates,
        totalEmployers,
        totalRevenue: parseFloat(financialStats.total_revenue as any) || 0,
        totalDue: parseFloat(financialStats.total_due as any) || 0,
        agentWiseReport: parsedAgentReport,
        connectionReport: parsedConnectionReport
      });
    } else {
      res.json({ message: 'Limited dashboard for your role' });
    }
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

export default router;
