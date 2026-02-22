import React, { useEffect, useState } from "react";
import api from "../services/api";
import { UserPlus, Phone, MapPin, User, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";

interface Agent {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  commission_rate: number;
  candidate_count: number;
}

const AgentList: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // show 10 items per page
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    commission_rate: 0,
  });

  // Debounced fetch
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAgents();
    }, 400);

    return () => clearTimeout(timeout);
  }, [page, search]);

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const params: any = { page, limit };
      if (search) params.search = search;

      const response = await api.get("/agents", { params });

      setAgents(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", { ...formData, role: "agent" });

      // Reset form
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

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-600">Loading agents...</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agents (Dalals)</h1>
          <p className="text-slate-500">
            Manage your recruitment network and agent performance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search agents..."
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add New Agent</span>
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <User className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Candidates
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {agent.candidate_count}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">{agent.name}</h3>
              <p className="text-slate-500 text-sm">{agent.email}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 text-slate-600">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{agent.phone || "No phone"}</span>
              </div>

              <div className="flex items-center space-x-3 text-slate-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm truncate">
                  {agent.address || "No address"}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase">Commission</p>
                <p className="text-sm font-bold text-slate-900">
                  {agent.commission_rate}%
                </p>
              </div>

              <Link
                to={`/agents/${agent.id}`}
                className="flex items-center space-x-2 text-indigo-600 font-bold text-sm"
              >
                <span>View Details</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Register New Agent</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input
                required
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <input
                required
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />

              <input
                type="password"
                required
                placeholder="Password"
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />

              <input
                type="text"
                placeholder="Phone"
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Commission Rate (%)"
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.commission_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_rate: Number(e.target.value),
                  })
                }
              />

              <textarea
                rows={2}
                placeholder="Address"
                className="w-full px-4 py-2 rounded-xl border"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700"
              >
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
