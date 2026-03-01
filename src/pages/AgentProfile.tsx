import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Mail,
  FileText,
  Edit2,
  Building2,
  Upload,
  Download,
  Trash2,
  Plus,
} from "lucide-react";

const AgentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [connectedEmployers, setConnectedEmployers] = useState<any[]>([]);
  const [agentDocuments, setAgentDocuments] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [assignCandidates, setAssignCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number>(0);
  const [assignError, setAssignError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAgentData = async () => {
    try {
      const [agentRes, employersRes, docsRes] = await Promise.all([
        api.get(`/agents/${id}`),
        api.get(`/employers/agent/${id}`),
        api.get(`/agents/${id}/documents`),
      ]);
      setData(agentRes.data);
      setConnectedEmployers(employersRes.data?.data || []);
      setAgentDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
    } catch (err: any) {
      console.error("Failed to fetch agent data", err);
      if (err.response?.status === 403) {
        alert("You do not have permission to view this agent");
        navigate("/agents");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [id, navigate]);

  const fetchAgentDocuments = async () => {
    try {
      const docsRes = await api.get(`/agents/${id}/documents`);
      setAgentDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
    } catch (err) {
      console.error("Failed to fetch agent documents", err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFile) return alert("Please select a file");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", documentFile);
      await api.post(`/agents/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadModal(false);
      setDocumentFile(null);
      fetchAgentDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/agents/${id}/documents/${documentId}`);
      fetchAgentDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete document");
    }
  };

  const handleDisconnectEmployer = async (employerId: number) => {
    if (!confirm("Disconnect this employer from this agent?")) return;
    try {
      await api.delete(`/employers/${employerId}/agents/${id}`);
      await fetchAgentData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to disconnect employer");
    }
  };

  const handleDisconnectCandidate = async (candidateId: number) => {
    if (!confirm("Remove this candidate from this agent?")) return;
    try {
      await api.delete(`/candidates/${candidateId}/agents/${id}`);
      await fetchAgentData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove candidate");
    }
  };

  const fetchAssignableCandidates = async () => {
    try {
      const response = await api.get("/candidates", {
        params: { page: 1, limit: 1000 },
      });
      const list = response.data?.data || [];
      const assignedCandidateIds = new Set(
        (data?.candidates || []).map((candidate: any) => Number(candidate.id)),
      );
      const filtered = Array.isArray(list)
        ? list.filter(
            (candidate: any) =>
              !assignedCandidateIds.has(Number(candidate.id)) &&
              (!candidate.agent_id || Number(candidate.agent_id) === 0),
          )
        : [];
      setAssignCandidates(filtered);
      setAssignError("");
    } catch (err) {
      console.error("Failed to fetch candidates for assignment", err);
      setAssignCandidates([]);
      setAssignError("Failed to load candidates");
    }
  };

  const openAssignModal = async () => {
    setSelectedCandidateId(0);
    setAssignError("");
    setShowAssignModal(true);
    await fetchAssignableCandidates();
  };

  const handleAssignCandidate = async () => {
    if (!selectedCandidateId) {
      setAssignError("Please select a candidate");
      return;
    }

    try {
      setAssigning(true);
      await api.put(`/candidates/${selectedCandidateId}/assign-agent`, {
        candidateId: selectedCandidateId,
        newAgentId: Number(id),
      });
      setShowAssignModal(false);
      await fetchAgentData();
    } catch (err: any) {
      setAssignError(err.response?.data?.message || "Failed to assign candidate");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!data) return <div className="p-8 text-center">Agent not found</div>;

  const { agent, candidates } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to List</span>
        </button>
        <div className="flex items-center gap-2">
          {["super_admin", "admin"].includes(user?.role || "") && (
            <Link
              to={`/agents/${id}/edit`}
              className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-semibold hover:bg-slate-200 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold shadow-lg">
                {agent.name?.charAt(0) || "A"}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{agent.name}</h2>
              <p className="text-slate-500 text-sm">{agent.email}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Phone</span>
                <span className="text-slate-900 font-medium">
                  {agent.phone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Address</span>
                <span className="text-slate-900 font-medium text-right max-w-[65%]">
                  {agent.address || "N/A"}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Connected Employers
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  {connectedEmployers.length}
                </span>
              </div>
              {connectedEmployers.length === 0 ? (
                <p className="text-sm text-slate-500">No employer connected yet.</p>
              ) : (
                <div className="space-y-2">
                  {connectedEmployers.map((employer: any) => (
                    <div
                      key={employer.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                    >
                      <Link
                        to={`/employers/${employer.id}`}
                        className="flex items-center space-x-2 min-w-0 flex-1"
                      >
                        <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {employer.company_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {Number(employer.candidate_count || 0)} Candidates
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 capitalize">
                          {employer.status || "active"}
                        </span>
                        {["super_admin", "admin"].includes(user?.role || "") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDisconnectEmployer(Number(employer.id))
                            }
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                            title="Disconnect employer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Additional Documents
              </h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {agentDocuments.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 transition-all group"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {doc.document_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(doc.file_size / 1024).toFixed(2)} KB •{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-all"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      {["super_admin", "admin"].includes(user?.role || "") && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Agent Ledger
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Candidates under {agent.name}
                  </p>
                </div>
                {["super_admin", "admin", "data_entry"].includes(
                  user?.role || "",
                ) && (
                  <div className="flex items-center gap-2">
                    {["super_admin", "admin"].includes(user?.role || "") && (
                      <button
                        type="button"
                        onClick={openAssignModal}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Assign Candidate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/candidates/new?agent_id=${agent.id}`)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Candidate
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Candidate</th>
                    <th className="px-6 py-4 font-semibold">Passport</th>
                    <th className="px-6 py-4 font-semibold">Employers</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-slate-500">
                          No candidates registered yet.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate: any) => (
                      <tr key={candidate.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {candidate.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                          {candidate.passport_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {candidate.employer_names ? (
                            <span className="line-clamp-2">
                              {candidate.employer_names}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not connected</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/candidates/${candidate.id}`}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-bold"
                            >
                              View
                            </Link>
                            {["super_admin", "admin"].includes(user?.role || "") && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDisconnectCandidate(Number(candidate.id))
                                }
                                className="text-red-600 hover:text-red-700"
                                title="Remove from this agent"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Upload Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-500"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
              <input
                type="file"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
              <button
                type="submit"
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Assign Candidate
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-500"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Assign to {agent.name}
                </label>
                <select
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={selectedCandidateId || ""}
                  onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
                >
                  <option value="">-- Select Candidate --</option>
                  {assignCandidates.map((candidate: any) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.passport_number})
                    </option>
                  ))}
                </select>
                {assignCandidates.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    No more candidate available for this agent.
                  </p>
                )}
              </div>

              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{assignError}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignCandidate}
                  disabled={assigning}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60"
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentProfile;
