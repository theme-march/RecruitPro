import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  X,
  Phone,
  CreditCard,
  FileText,
  Edit2,
} from "lucide-react";
import AssignAgentModal from "../components/AssignAgentModal";

interface Candidate {
  id: number;
  name: string;
  phone?: string;
  passport_number?: string;
  package_amount?: number;
  total_paid?: number;
  due_amount?: number;
  status?: string;
  agent_id?: number;
  agent_name?: string;
}

const CandidateList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [userRole, setUserRole] = useState<string>("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );

  useEffect(() => {
    fetchCandidates();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
  }, [page]);

  useEffect(() => {
    applyFilters();
  }, [search, statusFilter, candidates]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await api.get("/candidates", {
        params: { page, limit },
      });
      setCandidates(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...candidates];

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.passport_number?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    setFilteredCandidates(result);
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      medical: "bg-blue-100 text-blue-700",
      visa: "bg-purple-100 text-purple-700",
      completed: "bg-green-100 text-green-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-600">
        Loading candidates...
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">All Candidates</h1>
          {!["agent", "accountant"].includes(userRole) && (
            <Link
              to="/candidates/new"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Candidate
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, passport or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-700">Show only:</span>

          {["all", "pending", "medical", "visa", "completed"].map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="status"
                value={status}
                checked={statusFilter === status}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
              <span className="text-sm capitalize">{status}</span>
            </label>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Candidate
                </th>
                {["super_admin", "admin"].includes(userRole) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Agent
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Passport
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Payment Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredCandidates.map((c) => {
                const percent =
                  ((c.total_paid || 0) / (c.package_amount || 1)) * 100;

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {c.phone || "N/A"}
                      </div>
                    </td>

                    {["super_admin", "admin"].includes(userRole) && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {c.agent_name || "No Agent"}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCandidate(c);
                              setAssignModalOpen(true);
                            }}
                            className="ml-2 text-blue-600 hover:text-blue-700 p-1"
                            title="Reassign agent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}

                    <td className="px-4 py-4 font-mono text-sm">
                      {c.passport_number || "N/A"}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      ৳{c.package_amount?.toLocaleString() || 0}
                    </td>

                    <td className="px-4 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[140px]">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(percent, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        ৳{c.total_paid || 0} paid
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          c.status || "pending",
                        )}`}
                      >
                        {c.status || "pending"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        to={`/candidates/${c.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCandidates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No candidates found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredCandidates.length} of {total} candidates
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-gray-200 rounded disabled:opacity-50"
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
                      : "border-gray-200"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border border-gray-200 rounded disabled:opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {selectedCandidate && (
        <AssignAgentModal
          candidateId={selectedCandidate.id}
          candidateName={selectedCandidate.name}
          currentAgentId={selectedCandidate.agent_id || 0}
          currentAgentName={selectedCandidate.agent_name || "Unknown"}
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedCandidate(null);
          }}
          onAssign={() => {
            setPage(1);
            fetchCandidates();
          }}
        />
      )}
    </>
  );
};

export default CandidateList;
