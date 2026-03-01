import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Users, UserCheck, Clock, Building2 } from 'lucide-react';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center text-slate-600 py-8">Loading reports...</div>;
  }

  const canSeeConnectionReport = user?.role !== 'agent' && Array.isArray(stats?.connectionReport);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Collection report with connection details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><UserCheck className="w-4 h-4" /> Agents</div>
          <div className="text-2xl font-bold mt-2">{stats?.totalAgents || 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Building2 className="w-4 h-4" /> Employers</div>
          <div className="text-2xl font-bold mt-2">{stats?.totalEmployers || 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Users className="w-4 h-4" /> Candidates</div>
          <div className="text-2xl font-bold mt-2">{stats?.totalCandidates || 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><DollarSign className="w-4 h-4" /> Revenue</div>
          <div className="text-2xl font-bold mt-2">৳{stats?.totalRevenue?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Clock className="w-4 h-4" /> Due</div>
          <div className="text-2xl font-bold mt-2">৳{stats?.totalDue?.toLocaleString() || 0}</div>
        </div>
      </div>

      {canSeeConnectionReport ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-slate-900">Collection & Connection Report</h2>
            <p className="text-sm text-slate-500 mt-1">Agent ? Candidate ? Employer connection with collection amount.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-left">Candidate</th>
                  <th className="px-4 py-3 text-left">Passport</th>
                  <th className="px-4 py-3 text-left">Connected Employer(s)</th>
                  <th className="px-4 py-3 text-left">Collection</th>
                  <th className="px-4 py-3 text-left">Due</th>
                </tr>
              </thead>
              <tbody>
                {stats.connectionReport.map((row: any) => (
                  <tr key={`${row.agent_name}-${row.candidate_id}`} className="border-t border-gray-100">
                    <td className="px-4 py-3">{row.agent_name}</td>
                    <td className="px-4 py-3">{row.candidate_name}</td>
                    <td className="px-4 py-3">{row.passport_number}</td>
                    <td className="px-4 py-3">{row.employer_names}</td>
                    <td className="px-4 py-3">৳{Number(row.collection || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">৳{Number(row.due_amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-slate-600">
          Detailed connection report is available for admin roles.
        </div>
      )}
    </div>
  );
};

export default Reports;
