import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { User, UserRole } from "../types";
import { Users, Edit2, Check, X } from "lucide-react";
import { motion } from "motion/react";

const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("agent");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const roles: UserRole[] = [
    "super_admin",
    "admin",
    "agent",
    "accountant",
    "data_entry",
  ];

  useEffect(() => {
    console.log("[UserManagement] useEffect triggered, authUser:", authUser);

    if (authUser?.role !== "super_admin") {
      console.log("[UserManagement] Not super admin, setting error");
      setError("You do not have permission to manage users");
      setLoading(false);
      return;
    }

    if (!hasFetched) {
      console.log("[UserManagement] Fetching users...");
      fetchUsers();
      setHasFetched(true);
    } else {
      console.log("[UserManagement] Already fetched, skipping");
    }
  }, [authUser, hasFetched]);

  // refetch when page or search changes
  useEffect(() => {
    if (hasFetched) {
      fetchUsers();
    }
  }, [page, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const params: any = { page, limit };
      if (search) params.search = search;
      const response = await api.get("/auth/users", { params });
      console.log("[UserManagement] API Response:", response);
      const respData = response.data;
      console.log("[UserManagement] Response data:", respData);
      // API returns { data: [...], total, page, limit }
      const list = Array.isArray(respData?.data) ? respData.data : [];
      console.log("[UserManagement] Extracted users list length:", list.length);

      setUsers(list);
      setTotal(respData?.total || list.length);
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      setUsers([]); // Ensure users is always an array
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to fetch users";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
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

  if (authUser?.role !== "super_admin") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-semibold">Access Denied</p>
        <p className="text-red-600">Only super admins can manage users.</p>
      </div>
    );
  }

  if (loading) {
    console.log("[UserManagement] Rendering loading state");
    return (
      <div className="text-center text-slate-500 py-8">Loading users...</div>
    );
  }

  console.log("[UserManagement] Rendering with users:", users);
  console.log("[UserManagement] Users length:", users.length);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="text-indigo-600 w-8 h-8" />
            <h1 className="text-2xl font-bold text-slate-900">
              User Management
            </h1>
          </div>
          <input
            type="text"
            placeholder="Search users..."
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <p className="text-slate-500">Manage user roles across the system.</p>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700"
        >
          {message}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700"
        >
          {error}
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Current Role</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-900 font-medium">
                    {u.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setSelectedRole(e.target.value as UserRole)
                        }
                        className="px-3 py-2 rounded-lg border border-indigo-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role.replace("_", " ").charAt(0).toUpperCase() +
                              role.replace("_", " ").slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.role === "super_admin"
                            ? "bg-purple-100 text-purple-700"
                            : u.role === "admin"
                              ? "bg-blue-100 text-blue-700"
                              : u.role === "agent"
                                ? "bg-indigo-100 text-indigo-700"
                                : u.role === "accountant"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSaveRole(u.id)}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditClick(u.id, u.role)}
                        className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition font-medium text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Change Role</span>
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center text-slate-500 py-8">No users found.</div>
      )}
    </div>
  );
};

export default UserManagement;
