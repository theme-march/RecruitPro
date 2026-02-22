import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'agent') {
      const statsRows = await query<{ total_candidates: number; total_collection: number; total_due: number }[]>(
        `SELECT 
           COUNT(*) as total_candidates,
           SUM(total_paid) as total_collection,
           SUM(due_amount) as total_due
         FROM candidates 
         WHERE agent_id = ?`,
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
      const totalAgentsRows = await query<{ count: number }[]>("SELECT COUNT(*) as count FROM users WHERE role = 'agent'");
      const totalCandidatesRows = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM candidates');
      const financialStatsRows = await query<{ total_revenue: number; total_due: number }[]>(
        'SELECT SUM(total_paid) as total_revenue, SUM(due_amount) as total_due FROM candidates'
      );

      const agentWiseReport = await query<any>(
        `SELECT u.id, u.name, COUNT(c.id) as candidate_count, SUM(c.total_paid) as collection
         FROM users u
         LEFT JOIN candidates c ON u.id = c.agent_id
         WHERE u.role = 'agent'
         GROUP BY u.id`
      );

      const totalAgents = totalAgentsRows[0]?.count || 0;
      const totalCandidates = totalCandidatesRows[0]?.count || 0;
      const financialStats = financialStatsRows[0] || { total_revenue: 0, total_due: 0 };

      // ensure numeric values for revenue/due and also for each agent's collection
      const parsedAgentReport = agentWiseReport.map((r: any) => ({
        ...r,
        collection: parseFloat(r.collection) || 0
      }));

      res.json({
        totalAgents,
        totalCandidates,
        totalRevenue: parseFloat(financialStats.total_revenue as any) || 0,
        totalDue: parseFloat(financialStats.total_due as any) || 0,
        agentWiseReport: parsedAgentReport
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
