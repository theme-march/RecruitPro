import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Users,
  FileText,
  Globe,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { motion } from "motion/react";

const EmployerList: React.FC = () => {
  const [employers, setEmployers] = useState<any[]>([]);
  const [filteredEmployers, setFilteredEmployers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  useEffect(() => {
    fetchEmployers();
  }, [page]);

  useEffect(() => {
    applyFilters();
  }, [search, employers]);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/employers", { params: { page, limit } });
      setEmployers(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...employers];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.company_name.toLowerCase().includes(searchLower) ||
          e.country?.toLowerCase().includes(searchLower) ||
          e.industry?.toLowerCase().includes(searchLower),
      );
    }

    setFilteredEmployers(result);
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && employers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Employers</h1>
          <p className="text-gray-500 mt-1">
            Manage company profiles and connections
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to="/employers/new"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add Employer</span>
          </Link>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company name, country, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {search && (
          <div className="mt-3 text-sm text-gray-600">
            Found {filteredEmployers.length} results for "{search}"
          </div>
        )}
      </motion.div>

      {/* Employers Grid */}
      {filteredEmployers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            No employers found
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your search or add a new employer
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployers.map((employer, index) => (
            <motion.div
              key={employer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/employers/${employer.id}`}
                className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Logo/Header */}
                <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
                  {employer.logo_url ? (
                    <img
                      src={employer.logo_url}
                      alt={employer.company_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      {employer.logo_url ? (
                        <img
                          src={employer.logo_url}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {employer.company_name}
                  </h3>

                  <div className="space-y-2 mb-4">
                    {employer.country && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{employer.country}</span>
                      </div>
                    )}
                    {employer.industry && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{employer.industry}</span>
                      </div>
                    )}
                    {employer.website && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{employer.website}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  {(employer.contact_email || employer.contact_phone) && (
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      {employer.contact_person && (
                        <p className="text-sm font-semibold text-gray-900">
                          {employer.contact_person}
                        </p>
                      )}
                      {employer.contact_email && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">
                            {employer.contact_email}
                          </span>
                        </div>
                      )}
                      {employer.contact_phone && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          <span>{employer.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View Details Button */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-blue-600 text-sm font-semibold group-hover:text-blue-700 flex items-center justify-between">
                      <span>View Details</span>
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredEmployers.length} of {total} employers
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    page === pageNum
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                      : "border-2 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="px-2 text-gray-400">...</span>}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerList;
