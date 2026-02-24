import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Save, Upload, Edit2 } from "lucide-react";
import AssignAgentModal from "../components/AssignAgentModal";

const EditCandidate: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [candidateAgent, setCandidateAgent] = useState<{
    agent_id: number;
    agent_name: string;
  }>({ agent_id: 0, agent_name: "" });

  const [formData, setFormData] = useState({
    name: "",
    passport_number: "",
    phone: "",
    email: "",
    date_of_birth: "",
    package_amount: "",
    status: "",
  });

  const [packages, setPackages] = useState<
    { id: number; name: string; amount: number }[]
  >([]);

  const [files, setFiles] = useState<{
    passport_copy: File | null;
    cv: File | null;
    others: File[];
  }>({
    passport_copy: null,
    cv: null,
    others: [],
  });

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await api.get(`/candidates/${id}`);
        const c = response.data;
        setFormData({
          name: c.name,
          passport_number: c.passport_number,
          phone: c.phone,
          email: c.email || "",
          date_of_birth: c.date_of_birth || "",
          package_amount: c.package_amount.toString(),
          status: c.status,
        });
        setCandidateAgent({
          agent_id: c.agent_id || 0,
          agent_name: c.agent_name || "Unknown",
        });
      } catch (err) {
        console.error(err);
        alert("Failed to fetch candidate data");
      } finally {
        setFetching(false);
      }
    };

    const fetchPackages = async () => {
      try {
        const res = await api.get("/packages");
        const resp = res.data;
        const list = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : [];
        setPackages(list);
      } catch (err) {
        console.error("Failed to fetch packages", err);
        setPackages([]);
      }
    };

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(userData.role || "");

    fetchCandidate();
    fetchPackages();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.name === "others") {
        // allow multiple additional documents
        setFiles({ ...files, others: Array.from(e.target.files) });
      } else {
        setFiles({ ...files, [e.target.name]: e.target.files[0] });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) =>
      data.append(key, value as string),
    );
    if (files.passport_copy) data.append("passport_copy", files.passport_copy);
    if (files.cv) data.append("cv", files.cv);

    if (files.others && files.others.length > 0) {
      files.others.forEach((file) => {
        data.append("others", file); // NOT others[]
      });
    }

    try {
      await api.put(`/candidates/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/candidates/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update candidate");
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return <div className="p-8 text-center">Loading candidate data...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">
            Edit Candidate Profile
          </h1>
          <p className="text-slate-500 text-sm">
            Update information or upload missing documents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {["super_admin", "admin"].includes(userRole) && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Agent Assignment
                  </p>
                  <p className="text-lg font-semibold text-blue-900 mt-1">
                    {candidateAgent.agent_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Reassign
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Passport Number (Read-only)
              </label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                value={formData.passport_number}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                name="status"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="medical">Medical</option>
                <option value="visa">Visa</option>
                <option value="ticket">Ticket</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Total Package Amount (৳)
              </label>
              {packages.length > 0 ? (
                <select
                  name="package_amount"
                  required
                  disabled={user?.role === "data_entry"}
                  className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all ${
                    user?.role === "data_entry"
                      ? "bg-slate-50 text-slate-500"
                      : "focus:ring-2 focus:ring-indigo-500"
                  }`}
                  value={formData.package_amount}
                  onChange={handleChange}
                >
                  <option value="">-- Select Package --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.amount}>
                      {pkg.name} (৳{pkg.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  name="package_amount"
                  required
                  disabled={user?.role === "data_entry"}
                  className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none transition-all ${
                    user?.role === "data_entry"
                      ? "bg-slate-50 text-slate-500"
                      : "focus:ring-2 focus:ring-indigo-500"
                  }`}
                  value={formData.package_amount}
                  onChange={handleChange}
                />
              )}
              {user?.role === "data_entry" && (
                <p className="text-xs text-slate-400 italic">
                  Financial data can only be updated by Admin/Accountant.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Update Passport Copy
              </label>
              <div className="relative">
                <input
                  type="file"
                  name="passport_copy"
                  className="hidden"
                  id="passport_copy"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="passport_copy"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-600">
                    {files.passport_copy
                      ? files.passport_copy.name
                      : "Replace Passport Copy"}
                  </span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Update CV / Resume
              </label>
              <div className="relative">
                <input
                  type="file"
                  name="cv"
                  className="hidden"
                  id="cv"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="cv"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-600">
                    {files.cv ? files.cv.name : "Replace CV"}
                  </span>
                </label>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Additional Documents
              </label>
              <div className="relative">
                <input
                  type="file"
                  name="others"
                  multiple
                  className="hidden"
                  id="others"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="others"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-600">
                    {files.others.length
                      ? `${files.others.length} file(s) selected`
                      : "Upload Additional Documents"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? "Updating..." : "Update Profile"}</span>
            </button>
          </div>
        </form>
      </div>

      {candidateAgent && (
        <AssignAgentModal
          candidateId={parseInt(id || "0")}
          candidateName={formData.name}
          currentAgentId={candidateAgent.agent_id}
          currentAgentName={candidateAgent.agent_name}
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onAssign={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default EditCandidate;
