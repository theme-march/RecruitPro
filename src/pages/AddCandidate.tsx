import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Save, Upload } from "lucide-react";

interface Package {
  id: number;
  name: string;
  amount: string;
}

interface Agent {
  id: number;
  name: string;
  email: string;
}

interface Employer {
  id: number;
  company_name: string;
}

const AddCandidate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const preselectedAgentId =
    new URLSearchParams(location.search).get("agent_id") || "";

  const [loading, setLoading] = useState(false);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    passport_number: "",
    phone: "",
    email: "",
    date_of_birth: "",
    package_amount: "",
    employer_id: "",
    agent_id: "",
  });
  const isAgentPreselected =
    Boolean(preselectedAgentId) &&
    String(formData.agent_id) === String(preselectedAgentId);

  const [files, setFiles] = useState<{
    passport_copy: File | null;
    cv: File | null;
  }>({
    passport_copy: null,
    cv: null,
  });

  useEffect(() => {
    fetchPackages();
    if (user && user.role !== "agent") {
      fetchEmployers();
      fetchAgents();
    }
  }, [user, preselectedAgentId]);

  const fetchPackages = async () => {
    try {
      const response = await api.get("/packages");
      const resp = response.data;
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

  const fetchAgents = async () => {
    try {
      const response = await api.get("/agents");
      const resp = response.data;
      const list = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.data)
          ? resp.data
          : [];
      setAllAgents(list);
      setAgents(list);
      if (preselectedAgentId) {
        const matchedAgent = list.find(
          (agent: Agent) => String(agent.id) === String(preselectedAgentId),
        );
        if (matchedAgent) {
          setFormData((prev) => ({ ...prev, agent_id: String(matchedAgent.id) }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch agents", err);
      setAgents([]);
    }
  };

  const fetchEmployers = async () => {
    try {
      const response = await api.get("/employers", {
        params: { page: 1, limit: 1000 },
      });
      setEmployers(response.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch employers", err);
      setEmployers([]);
    }
  };

  const fetchEmployerAgents = async (employerId: string) => {
    if (!employerId) {
      setAgents(allAgents);
      return;
    }
    try {
      const response = await api.get(`/employers/${employerId}`);
      const connectedAgents = response.data?.connected_agents || [];
      setAgents(connectedAgents);
    } catch (err) {
      console.error("Failed to fetch employer agents", err);
      setAgents([]);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (e.target.name === "employer_id") {
      const employerId = e.target.value;
      setFormData({
        ...formData,
        employer_id: employerId,
        agent_id: preselectedAgentId || "",
      });
      if (!preselectedAgentId) {
        fetchEmployerAgents(employerId);
      }
      return;
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles({ ...files, [e.target.name]: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value as string);
    });
    if (files.passport_copy) data.append("passport_copy", files.passport_copy);
    if (files.cv) data.append("cv", files.cv);

    try {
      await api.post("/candidates", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/candidates");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

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
            Add New Candidate
          </h1>
          <p className="text-slate-500 text-sm">
            Fill in the details to register a new candidate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {user?.role !== "agent" && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Select Employer
                </label>
                <select
                  name="employer_id"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.employer_id}
                  onChange={handleChange}
                >
                  <option value="">-- Select Employer --</option>
                  {employers.map((employer) => (
                    <option key={employer.id} value={employer.id}>
                      {employer.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user?.role !== "agent" && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Select Agent
                </label>
                <select
                  name="agent_id"
                  disabled={isAgentPreselected}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.agent_id}
                  onChange={handleChange}
                >
                  <option value="">
                    {isAgentPreselected
                      ? "-- Assigned from Agent Profile --"
                      : "-- Select Agent (Optional) --"}
                  </option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                Passport Number
              </label>
              <input
                type="text"
                name="passport_number"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.passport_number}
                onChange={handleChange}
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
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Total Package Amount (৳) (Optional)
              </label>
              <select
                name="package_amount"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.package_amount}
                onChange={handleChange}
              >
                <option value="">-- Select Package --</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.amount}>
                    {pkg.name} (৳{parseFloat(pkg.amount).toLocaleString()})
                  </option>
                ))}
              </select>
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
                      : "Upload Passport Copy"}
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
                    {files.cv ? files.cv.name : "Upload CV"}
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
              <span>{loading ? "Saving..." : "Save Candidate"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCandidate;
