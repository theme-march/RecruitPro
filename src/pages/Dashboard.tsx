import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="h-12 bg-gray-200 rounded-xl mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const adminCards = [
    { 
      label: 'Total Agents', 
      value: stats?.totalAgents || 0, 
      icon: UserCheck, 
      gradient: 'from-blue-500 to-blue-600',
      change: '+12%',
      positive: true
    },
    { 
      label: 'Total Candidates', 
      value: stats?.totalCandidates || 0, 
      icon: Users, 
      gradient: 'from-indigo-500 to-indigo-600',
      change: '+8%',
      positive: true
    },
    { 
      label: 'Total Revenue', 
      value: `৳${stats?.totalRevenue?.toLocaleString() || 0}`, 
      icon: DollarSign, 
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+23%',
      positive: true
    },
    { 
      label: 'Total Due', 
      value: `৳${stats?.totalDue?.toLocaleString() || 0}`, 
      icon: Clock, 
      gradient: 'from-amber-500 to-amber-600',
      change: '-5%',
      positive: false
    },
  ];

  const agentCards = [
    { 
      label: 'My Candidates', 
      value: stats?.totalCandidates || 0, 
      icon: Users, 
      gradient: 'from-indigo-500 to-indigo-600',
      change: '+15%',
      positive: true
    },
    { 
      label: 'My Collection', 
      value: `৳${stats?.totalCollection?.toLocaleString() || 0}`, 
      icon: DollarSign, 
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+20%',
      positive: true
    },
    { 
      label: 'My Due', 
      value: `৳${stats?.totalDue?.toLocaleString() || 0}`, 
      icon: Clock, 
      gradient: 'from-amber-500 to-amber-600',
      change: '-8%',
      positive: false
    },
    { 
      label: 'Performance', 
      value: '92%', 
      icon: Target, 
      gradient: 'from-purple-500 to-purple-600',
      change: '+3%',
      positive: true
    },
  ];

  const cards = user?.role === 'agent' ? agentCards : adminCards;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
            <p className="text-blue-100 text-lg">Here's what's happening with your recruitment business today.</p>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-16 h-16" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center space-x-1 text-sm font-semibold ${card.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {card.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{card.change}</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`h-1 bg-gradient-to-r ${card.gradient}`}></div>
          </motion.div>
        ))}
      </div>

      {/* Agent Performance Table */}
      {user?.role !== 'agent' && stats?.agentWiseReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Agent Performance</h2>
                <p className="text-gray-500 text-sm mt-1">Track your top performing agents</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Agent Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Candidates</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Collection</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.agentWiseReport.map((report: any, index: number) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                          {report.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{report.name}</p>
                          <p className="text-xs text-gray-500">Agent #{report.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{report.candidate_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-600">৳{report.collection?.toLocaleString() || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" 
                            style={{ width: `${Math.min((report.candidate_count / 20) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-600">
                          {Math.round((report.candidate_count / 20) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        Active
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
        >
          <UserCheck className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold mb-2">Add New Agent</h3>
          <p className="text-blue-100">Expand your network</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
        >
          <Users className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold mb-2">Add Candidate</h3>
          <p className="text-emerald-100">Register new candidate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
        >
          <DollarSign className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold mb-2">View Reports</h3>
          <p className="text-amber-100">Financial insights</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
