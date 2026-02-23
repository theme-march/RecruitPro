import React, { useEffect, useState } from "react";
import api from "../services/api";
import { UserPlus, Search, Filter, Settings, User, Phone, Mail, MapPin, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";

interface Agent {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  commission_rate: number;
  candidate_count: number;
  status?: string;
  created_at?: string;
}

const AgentList: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    commission_rate: 0,
  });

  // Fetch agents from API
  useEffect(() => {
    fetchAgents();
  }, [page]);

  // Apply search and filter locally
  useEffect(() => {
    applyFilters();
  }, [search, filterStatus, agents]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      const response = await api.get("/agents", { params });
      setAgents(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...agents];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.email.toLowerCase().includes(searchLower) ||
          agent.phone?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((agent) => {
        const status = agent.status || (agent.candidate_count > 5 ? "active" : agent.candidate_count > 0 ? "pending" : "inactive");
        return status === filterStatus;
      });
    }

    setFilteredAgents(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", { ...formData, role: "agent" });
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        commission_rate: 0,
      });
      setShowAddModal(false);
      fetchAgents();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add agent");
    }
  };

  const clearSearch = () => {
    setSearch("");
    setFilterStatus("all");
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getProgressColor = (count: number) => {
    if (count >= 10) return "bg-green-500";
    if (count >= 5) return "bg-blue-500";
    return "bg-gray-400";
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Loading agents...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">All Agents</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Add new agent
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button 
          onClick={fetchAgents}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Search className="w-5 h-5" />
          Search
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Filter className="w-5 h-5" />
          Filter
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Settings className="w-5 h-5" />
          Configurations
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-gray-700">Show only:</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="filter"
            value="all"
            checked={filterStatus === "all"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">All</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="filter"
            value="active"
            checked={filterStatus === "active"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">Active agents</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="filter"
            value="pending"
            checked={filterStatus === "pending"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">Agents in progress</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="filter"
            value="inactive"
            checked={filterStatus === "inactive"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">Agents in review</span>
        </label>
      </div>

      {/* Search Results Info */}
      {search && (
        <div className="text-sm text-gray-600">
          Found {filteredAgents.length} results for "{search}"
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-4 py-3">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Agent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Preview</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Candidates</th>
              <th className="w-8 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAgents.map((agent, index) => {
              const progress = Math.min((agent.candidate_count / 20) * 100, 100);
              const status = agent.status || (agent.candidate_count > 5 ? "active" : agent.candidate_count > 0 ? "pending" : "inactive");
              
              return (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{agent.name}</div>
                    <div className="text-sm text-gray-500">{agent.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                        {agent.name.charAt(0)}
                      </div>
                      {agent.phone && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                          <Phone className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(agent.candidate_count)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/agents/${agent.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Website
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                        <span className="text-xs">⏱️</span>
                      </div>
                      <span className="text-sm text-gray-700">{agent.commission_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {agent.candidate_count}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No agents found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredAgents.length} of {total} agents
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            &lt;
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 border rounded ${
                  page === pageNum
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {totalPages > 5 && <span className="px-2">...</span>}
          {totalPages > 5 && (
            <button
              onClick={() => setPage(totalPages)}
              className={`px-3 py-1 border rounded ${
                page === totalPages
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              {totalPages}
            </button>
          )}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Register New Agent</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input
                required
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-2 border rounded-lg"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-lg"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                type="password"
                required
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-lg"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <input
                type="text"
                placeholder="Phone"
                className="w-full px-4 py-2 border rounded-lg"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                type="number"
                placeholder="Commission Rate (%)"
                className="w-full px-4 py-2 border rounded-lg"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
              />
              <textarea
                rows={2}
                placeholder="Address"
                className="w-full px-4 py-2 border rounded-lg"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700">
                Create Agent Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentList;
