import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Package } from "../types";
import { Layers, Plus, Edit2, Check, X, Trash2 } from "lucide-react";
import SearchInput from "../components/SearchInput";
import { motion } from "motion/react";
import { log } from "console";

const PackageManagement: React.FC = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    description: "",
  });
  const [editData, setEditData] = useState({
    name: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    if (user?.role !== "super_admin") {
      setError("You do not have permission to manage packages");
      setLoading(false);
      return;
    }
    fetchPackages();
  }, [user, page, search]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      const response = await api.get("/packages", { params });
      if (!Array.isArray(response.data?.data)) {
        console.warn(
          "[PackageManagement] unexpected response format",
          response.data,
        );
        setError("Failed to load packages: invalid response format");
        setPackages([]);
      } else {
        setPackages(response.data.data);
        setTotal(response.data.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to fetch packages", err);
      setError("Failed to fetch packages");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPackage = async () => {
    try {
      if (!formData.name || !formData.amount) {
        setError("Name and amount are required");
        return;
      }

      await api.post("/packages", {
        name: formData.name,
        amount: parseFloat(formData.amount),
        description: formData.description,
      });

      setMessage("Package created successfully");
      setFormData({ name: "", amount: "", description: "" });
      setShowAddForm(false);
      fetchPackages();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || "Failed to create package";
      setError(errorMsg);
    }
  };

  const handleEditStart = (pkg: Package) => {
    setEditingId(pkg.id);
    setEditData({
      name: pkg.name,
      amount: pkg.amount.toString(),
      description: pkg.description || "",
    });
  };

  const handleEditSave = async (pkgId: number) => {
    try {
      if (!editData.name || !editData.amount) {
        setError("Name and amount are required");
        return;
      }

      await api.put(`/packages/${pkgId}`, {
        name: editData.name,
        amount: parseFloat(editData.amount),
        description: editData.description,
      });

      setMessage("Package updated successfully");
      setEditingId(null);
      fetchPackages();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || "Failed to update package";
      setError(errorMsg);
    }
  };

  const handleDelete = async (pkgId: number) => {
    if (!confirm("Are you sure you want to delete this package?")) return;

    try {
      await api.delete(`/packages/${pkgId}`);
      setMessage("Package deleted successfully");
      fetchPackages();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || "Failed to delete package";
      setError(errorMsg);
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-semibold">Access Denied</p>
        <p className="text-red-600">Only super admins can manage packages.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center text-slate-500 py-8">Loading packages...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Layers className="text-indigo-600 w-8 h-8" />
            <h1 className="text-2xl font-bold text-slate-900">
              Package Management
            </h1>
          </div>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search packages..."
          />
        </div>
        <p className="text-slate-500">
          Create and manage predefined package amounts.
        </p>
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

      {/* Add Package Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4"
        >
          <h3 className="text-lg font-bold text-slate-900">Add New Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Package Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Amount (৳)"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddPackage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Create</span>
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ name: "", amount: "", description: "" });
                setError("");
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Packages Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Packages</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Package</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.map((pkg) => (
                <motion.tr
                  key={pkg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-900 font-medium">
                    {editingId === pkg.id ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        className="px-3 py-1 rounded border border-indigo-300 w-full"
                      />
                    ) : (
                      pkg.name
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {editingId === pkg.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editData.amount}
                        onChange={(e) =>
                          setEditData({ ...editData, amount: e.target.value })
                        }
                        className="px-3 py-1 rounded border border-indigo-300 w-full"
                      />
                    ) : (
                      `৳${parseFloat(pkg.amount.toString()).toLocaleString()}`
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {editingId === pkg.id ? (
                      <input
                        type="text"
                        value={editData.description}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            description: e.target.value,
                          })
                        }
                        className="px-3 py-1 rounded border border-indigo-300 w-full"
                      />
                    ) : (
                      pkg.description || "-"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === pkg.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSave(pkg.id)}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditStart(pkg)}
                          className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {packages.length === 0 && !showAddForm && (
        <div className="text-center text-slate-500 py-8">
          No packages found. Create one to get started.
        </div>
      )}

      {/* pagination controls */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-600">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
          {total}
        </p>
        <div className="space-x-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackageManagement;
