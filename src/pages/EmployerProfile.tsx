import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  Users,
  UserPlus,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit2,
  Plus,
  X,
} from "lucide-react";

const EmployerProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employer, setEmployer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectAgent, setShowConnectAgent] = useState(false);
  const [showConnectCandidate, setShowConnectCandidate] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [connectAgentForm, setConnectAgentForm] = useState({ agentId: "" });
  const [connectCandidateForm, setConnectCandidateForm] = useState({
    agentId: "",
    candidateId: "",
    position: "",
    package_amount: "",
    joining_date: "",
  });
  const [uploadForm, setUploadForm] = useState({
    target_type: "all",
    target_id: "",
    description: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [empRes, agentsRes, candidatesRes] = await Promise.all([
        api.get(`/employers/${id}`),
        api.get("/agents"),
        api.get("/candidates"),
      ]);
      setEmployer(empRes.data);
      setAgents(agentsRes.data.data || []);
      setCandidates(candidatesRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/employers/${id}/connect-agent`, {
        employerId: id,
        agentId: connectAgentForm.agentId,
      });
      setShowConnectAgent(false);
      setConnectAgentForm({ agentId: "" });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to connect agent");
    }
  };

  const handleConnectCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/employers/${id}/connect-candidate`, {
        employerId: id,
        ...connectCandidateForm,
      });
      setShowConnectCandidate(false);
      setConnectCandidateForm({
        agentId: "",
        candidateId: "",
        position: "",
        package_amount: "",
        joining_date: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to connect candidate");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) return alert("Please select a file");
    try {
      const formData = new FormData();
      formData.append("document", uploadForm.file);
      formData.append("target_type", uploadForm.target_type);
      if (uploadForm.target_id)
        formData.append("target_id", uploadForm.target_id);
      if (uploadForm.description)
        formData.append("description", uploadForm.description);
      await api.post(`/employers/${id}/upload-document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadDoc(false);
      setUploadForm({
        target_type: "all",
        target_id: "",
        description: "",
        file: null,
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload document");
    }
  };

  const handleDisconnectAgent = async (agentId: number) => {
    if (!confirm("Disconnect this agent?")) return;
    try {
      await api.delete(`/employers/${id}/agents/${agentId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to disconnect agent");
    }
  };

  const handleDisconnectCandidate = async (candidateId: number) => {
    if (!confirm("Disconnect this candidate?")) return;
    try {
      await api.delete(`/employers/${id}/candidates/${candidateId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to disconnect candidate");
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/employers/documents/${documentId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete document");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!employer)
    return <div className="p-8 text-center">Employer not found</div>;

  const isAdmin = ["super_admin", "admin"].includes(user?.role || "");
  const connectedAgentIds = new Set(
    (employer.connected_agents || []).map((a: any) => Number(a.id)),
  );
  const connectedAgents = employer.connected_agents || [];
  const eligibleCandidates = candidates.filter((candidate: any) =>
    connectedAgentIds.has(Number(candidate.agent_id)),
  );
  const selectedAgentCandidates = connectCandidateForm.agentId
    ? eligibleCandidates.filter(
        (candidate: any) =>
          Number(candidate.agent_id) === Number(connectCandidateForm.agentId),
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to List</span>
      </button>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
          {employer.logo_url && (
            <img
              src={employer.logo_url}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>
        <div className="p-6 -mt-16 relative">
          <div className="flex items-end space-x-6">
            <div className="w-32 h-32 bg-white rounded-2xl shadow-xl flex items-center justify-center">
              {employer.logo_url ? (
                <img
                  src={employer.logo_url}
                  alt=""
                  className="w-28 h-28 rounded-xl object-cover"
                />
              ) : (
                <Building2 className="w-16 h-16 text-blue-600" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {employer.company_name}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                {employer.country && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{employer.country}</span>
                  </div>
                )}
                {employer.industry && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{employer.industry}</span>
                  </div>
                )}
              </div>
            </div>
            {isAdmin && (
              <Link
                to={`/employers/${id}/edit`}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </Link>
            )}
          </div>
          {employer.description && (
            <p className="mt-4 text-gray-600">{employer.description}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {employer.website && (
              <div className="flex items-center space-x-2 text-sm">
                <Globe className="w-4 h-4 text-gray-400" />
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {employer.website}
                </a>
              </div>
            )}
            {employer.contact_email && (
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <a
                  href={`mailto:${employer.contact_email}`}
                  className="text-gray-600 hover:underline"
                >
                  {employer.contact_email}
                </a>
              </div>
            )}
            {employer.contact_phone && (
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{employer.contact_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Connected Agents ({employer.connected_agents?.length || 0})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowConnectAgent(true)}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {employer.connected_agents?.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No agents connected
              </p>
            ) : (
              employer.connected_agents?.map((agent: any) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <Link
                    to={`/agents/${agent.id}`}
                    className="flex items-center space-x-3 flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-500">{agent.email}</p>
                    </div>
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleDisconnectAgent(agent.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-green-600" />
              Connected Candidates ({employer.connected_candidates?.length || 0}
              )
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowConnectCandidate(true)}
                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {employer.connected_candidates?.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No candidates connected
              </p>
            ) : (
              employer.connected_candidates?.map((candidate: any) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <Link
                    to={`/candidates/${candidate.id}`}
                    className="flex items-center space-x-3 flex-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {candidate.position || "N/A"} • Package: ৳
                        {Number(candidate.package_amount || candidate.salary || 0).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleDisconnectCandidate(candidate.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            Documents ({employer.documents?.length || 0})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowUploadDoc(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employer.documents?.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-8">
              No documents uploaded
            </p>
          ) : (
            employer.documents?.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-all"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {doc.document_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.target_type === "all" ? "All" : doc.target_type} •{" "}
                      {(doc.file_size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  <a
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showConnectAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Connect Agent</h3>
              <button onClick={() => setShowConnectAgent(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleConnectAgent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Agent
                </label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                  value={connectAgentForm.agentId}
                  onChange={(e) =>
                    setConnectAgentForm({ agentId: e.target.value })
                  }
                >
                  <option value="">-- Select Agent --</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Connect Agent
              </button>
            </form>
          </div>
        </div>
      )}
      {showConnectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Connect Candidate
              </h3>
              <button onClick={() => setShowConnectCandidate(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleConnectCandidate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Agent
                </label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                  value={connectCandidateForm.agentId}
                  onChange={(e) =>
                    setConnectCandidateForm({
                      ...connectCandidateForm,
                      agentId: e.target.value,
                      candidateId: "",
                    })
                  }
                >
                  <option value="">-- Select Agent --</option>
                  {connectedAgents.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Candidate
                </label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                  value={connectCandidateForm.candidateId}
                  disabled={
                    !connectCandidateForm.agentId ||
                    selectedAgentCandidates.length === 0
                  }
                  onChange={(e) =>
                    setConnectCandidateForm({
                      ...connectCandidateForm,
                      candidateId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    {!connectCandidateForm.agentId
                      ? "-- Select Agent First --"
                      : selectedAgentCandidates.length === 0
                        ? "-- No candidate available --"
                      : "-- Select Candidate --"}
                  </option>
                  {selectedAgentCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.passport_number})
                    </option>
                  ))}
                </select>
                {connectCandidateForm.agentId &&
                  selectedAgentCandidates.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    No candidate found under this agent.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={
                  !connectCandidateForm.agentId ||
                  selectedAgentCandidates.length === 0
                }
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all"
              >
                Connect Candidate
              </button>
            </form>
          </div>
        </div>
      )}
      {showUploadDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Upload Document
              </h3>
              <button onClick={() => setShowUploadDoc(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target
                </label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  value={uploadForm.target_type}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      target_type: e.target.value,
                    })
                  }
                >
                  <option value="all">All (Agents & Candidates)</option>
                  <option value="agent">Specific Agent</option>
                  <option value="candidate">Specific Candidate</option>
                </select>
              </div>
              {uploadForm.target_type !== "all" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select{" "}
                    {uploadForm.target_type === "agent" ? "Agent" : "Candidate"}
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                    value={uploadForm.target_id}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        target_id: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Select --</option>
                    {(uploadForm.target_type === "agent"
                      ? agents
                      : candidates
                    ).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File
                </label>
                <input
                  type="file"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      file: e.target.files?.[0] || null,
                    })
                  }
                />
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-all"
              >
                Upload Document
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerProfile;
