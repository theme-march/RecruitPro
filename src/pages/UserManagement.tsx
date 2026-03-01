import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { User, UserRole } from "../types";
import { Search, Filter, Settings, Edit2, Check, X, Users, Trash2 } from "lucide-react";
import { motion } from "motion/react";

const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("agent");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const roles: UserRole[] = ["super_admin", "admin", "agent", "accountant", "data_entry"];

  useEffect(() => {
    if (authUser?.role !== "super_admin") {
      setError("You do not have permission to manage users");
      setLoading(false);
      return;
    }
    if (!hasFetched) {
      fetchUsers();
      setHasFetched(true);
    }
  }, [authUser, hasFetched]);

  useEffect(() => {
    if (hasFetched) {
      const timer = setTimeout(() => {
        fetchUsers();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [page, search, hasFetched]);

  // Apply search and filter locally
  useEffect(() => {
    applyFilters();
  }, [search, filterStatus, users]);

  const fetchUsers = async () => {
    const showInitialLoader = !hasLoaded;
    try {
      if (showInitialLoader) setLoading(true);
      setError("");
      const params: any = { page, limit, search };
      const response = await api.get("/auth/users", { params });
      const respData = response.data;
      const list = Array.isArray(respData?.data) ? respData.data : [];
      setUsers(list);
      setTotal(respData?.total || list.length);
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      setUsers([]);
      const errorMsg = err.response?.data?.message || err.message || "Failed to fetch users";
      setError(errorMsg);
    } finally {
      if (showInitialLoader) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  };

  const applyFilters = () => {
    let result = [...users];

    // Role filter
    if (filterStatus !== "all") {
      if (filterStatus === "admin") {
        result = result.filter((u) => u.role === "super_admin" || u.role === "admin");
      } else if (filterStatus === "agent") {
        result = result.filter((u) => u.role === "agent");
      } else if (filterStatus === "other") {
        result = result.filter((u) => u.role === "accountant" || u.role === "data_entry");
      }
    }

    setFilteredUsers(result);
  };

  const handleEditClick = (userId: number, currentRole: UserRole) => {
    setEditingId(userId);
    setSelectedRole(currentRole);
    setMessage("");
    setError("");
  };

  const handleSaveRole = async (userId: number) => {
    try {
      await api.put(`/auth/users/${userId}/role`, { newRole: selectedRole });
      setMessage("Role updated successfully");
      setEditingId(null);
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to update role";
      setError(errorMsg);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setError("");
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      setMessage("User deleted successfully");
      fetchUsers();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
    setFilterStatus("all");
  };

  const totalPages = Math.ceil(total / limit);

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-700",
      admin: "bg-blue-100 text-blue-700",
      agent: "bg-indigo-100 text-indigo-700",
      accountant: "bg-green-100 text-green-700",
      data_entry: "bg-yellow-100 text-yellow-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getProgressByRole = (role: UserRole) => {
    const progress: Record<string, number> = {
      super_admin: 100,
      admin: 85,
      agent: 60,
      accountant: 70,
      data_entry: 40,
    };
    return progress[role] || 50;
  };

  if (authUser?.role !== "super_admin") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-semibold">Access Denied</p>
        <p className="text-red-600">Only super admins can manage users.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center text-slate-500 py-8">Loading users...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage user roles across the system.</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
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
            fetchUsers();
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
            value="admin"
            checked={filterStatus === "admin"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">Admin users</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="filter"
            value="agent"
            checked={filterStatus === "agent"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">Agents</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="filter"
            value="other"
            checked={filterStatus === "other"}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-4 h-4"
          />
          <span className="text-sm">Other roles</span>
        </label>
      </div>

      {/* Search Results Info */}
      {search && (
        <div className="text-sm text-gray-600">
          Found {filteredUsers.length} results for "{search}"
        </div>
      )}

      {/* Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700"
        >
          {message}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-4 py-3">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avatar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Preview</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              <th className="w-8 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => {
              const progress = getProgressByRole(u.role);
              const isEditing = editingId === u.id;

              return (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                        {u.name.charAt(0)}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                        {u.name.charAt(1) || "U"}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <a
                      href="#"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Users className="w-4 h-4" />
                      Website
                    </a>
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="px-3 py-1 rounded-lg border border-blue-300 focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role.replace("_", " ").charAt(0).toUpperCase() + role.replace("_", " ").slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveRole(u.id)}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditClick(u.id, u.role)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Change Role</span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {authUser && u.id !== authUser.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No users found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {total} users
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
    </div>
  );
};

export default UserManagement;
