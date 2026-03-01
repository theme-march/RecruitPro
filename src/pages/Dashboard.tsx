import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Users,
  DollarSign,
  Clock,
  UserCheck,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
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
      positive: true,
    },
    {
      label: 'Total Candidates',
      value: stats?.totalCandidates || 0,
      icon: Users,
      gradient: 'from-indigo-500 to-indigo-600',
      change: '+8%',
      positive: true,
    },
    {
      label: 'Total Employers',
      value: stats?.totalEmployers || 0,
      icon: Building2,
      gradient: 'from-cyan-500 to-sky-600',
      change: '+6%',
      positive: true,
    },
    {
      label: 'Total Revenue',
      value: `৳${stats?.totalRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+23%',
      positive: true,
    },
    {
      label: 'Total Due',
      value: `৳${stats?.totalDue?.toLocaleString() || 0}`,
      icon: Clock,
      gradient: 'from-amber-500 to-amber-600',
      change: '-5%',
      positive: false,
    },
  ];

  const agentCards = [
    {
      label: 'My Candidates',
      value: stats?.totalCandidates || 0,
      icon: Users,
      gradient: 'from-indigo-500 to-indigo-600',
      change: '+15%',
      positive: true,
    },
    {
      label: 'My Collection',
      value: `৳${stats?.totalCollection?.toLocaleString() || 0}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+20%',
      positive: true,
    },
    {
      label: 'My Due',
      value: `৳${stats?.totalDue?.toLocaleString() || 0}`,
      icon: Clock,
      gradient: 'from-amber-500 to-amber-600',
      change: '-8%',
      positive: false,
    },
    {
      label: 'Performance',
      value: '92%',
      icon: Target,
      gradient: 'from-purple-500 to-purple-600',
      change: '+3%',
      positive: true,
    },
  ];

  const cards = user?.role === 'agent' ? agentCards : adminCards;
  const canManageAgents = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-blue-100 text-lg">Here's what's happening with your recruitment business today.</p>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-16 h-16" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${user?.role === 'agent' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-6`}>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className={`bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all group ${canManageAgents ? 'block' : 'hidden'}`}
        >
          <Link to="/agents?openAdd=1" className="block">
            <UserCheck className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold mb-2">Add New Agent</h3>
            <p className="text-blue-100">Expand your network</p>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all group"
        >
          <Link to="/candidates/new" className="block">
            <Users className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold mb-2">Add Candidate</h3>
            <p className="text-emerald-100">Register new candidate</p>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all group"
        >
          <Link to="/reports" className="block">
            <DollarSign className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold mb-2">View Reports</h3>
            <p className="text-amber-100">Financial insights</p>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
