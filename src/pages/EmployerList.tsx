import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Plus,
  Search,
  Filter,
  Settings,
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";

interface Employer {
  id: number;
  company_name: string;
  company_address?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  country?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  description?: string;
}

const EmployerList: React.FC = () => {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [filteredEmployers, setFilteredEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState("all");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployers();
    }, 250);
    return () => clearTimeout(timer);
  }, [page, search]);

  useEffect(() => {
    applyFilters();
  }, [search, filterStatus, employers]);

  const fetchEmployers = async () => {
    const showInitialLoader = !hasLoaded;
    try {
      if (showInitialLoader) setLoading(true);
      const response = await api.get("/employers", { params: { page, limit, search } });
      setEmployers(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      if (showInitialLoader) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  };

  const getStatus = (employer: Employer) => {
    if (employer.contact_email || employer.contact_phone) return "active";
    if (employer.country || employer.industry || employer.website)
      return "pending";
    return "inactive";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getProfileProgress = (employer: Employer) => {
    const fields = [
      employer.company_name,
      employer.company_address,
      employer.contact_person,
      employer.contact_email,
      employer.contact_phone,
      employer.country,
      employer.industry,
      employer.website,
      employer.description,
      employer.logo_url,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 40) return "bg-blue-500";
    return "bg-gray-400";
  };

  const applyFilters = () => {
    let result = [...employers];

    if (filterStatus !== "all") {
      result = result.filter((e) => getStatus(e) === filterStatus);
    }

    setFilteredEmployers(result);
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
    setFilterStatus("all");
  };

  const handleDelete = async (employerId: number) => {
    if (!confirm("Delete this employer?")) return;
    try {
      await api.delete(`/employers/${employerId}`);
      fetchEmployers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete employer");
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-600">Loading employers...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">All Employers</h1>
        <Link
          to="/employers/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-5 h-5" />
          Add new employer
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company name, country, industry, or email..."
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
          onClick={() => {
            setPage(1);
            fetchEmployers();
          }}
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
          <span className="text-sm">Active employers</span>
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
          <span className="text-sm">Employers in progress</span>
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
          <span className="text-sm">Employers in review</span>
        </label>
      </div>

      {search && (
        <div className="text-sm text-gray-600">
          Found {filteredEmployers.length} results for "{search}"
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-4 py-3">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Employer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Preview
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Industry
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Country
              </th>
              {["super_admin", "admin"].includes(userRole) && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              )}
              <th className="w-8 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEmployers.map((employer) => {
              const status = getStatus(employer);
              const progress = getProfileProgress(employer);

              return (
                <tr key={employer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">
                      {employer.company_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {employer.contact_person || "No contact person"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                        {employer.company_name?.charAt(0) || "E"}
                      </div>
                      {employer.contact_phone && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                          <Phone className="w-4 h-4" />
                        </div>
                      )}
                      {employer.contact_email && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                          <Mail className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/employers/${employer.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Profile
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{employer.industry || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{employer.country || "N/A"}</span>
                    </div>
                  </td>
                  {["super_admin", "admin"].includes(userRole) && (
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(employer.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete employer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    {employer.website ? (
                      <a
                        href={employer.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        title="Open website"
                      >
                        <Globe className="w-5 h-5" />
                      </a>
                    ) : (
                      <button
                        className="text-gray-300 cursor-default"
                        title="No website"
                        type="button"
                      >
                        <Globe className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEmployers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No employers found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredEmployers.length} of {total} employers
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            &lt;
          </button>
          {[...Array(Math.min(5, totalPages || 1))].map((_, i) => {
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
            onClick={() => setPage(Math.min(totalPages || 1, page + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployerList;
