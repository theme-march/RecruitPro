import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  FileText,
  Download,
  Plus,
  Edit2,
  Trash2,
  Building2,
  UserPlus,
} from "lucide-react";
import AssignAgentModal from "../components/AssignAgentModal";

const CandidateProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [cRes, employersRes] = await Promise.all([
        api.get(`/candidates/${id}`),
        api.get(`/employers/candidate/${id}`),
      ]);
      setCandidate({
        ...cRes.data,
        connected_employers:
          employersRes.data?.data || cRes.data?.connected_employers || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await api.delete(`/candidates/${id}/documents/${documentId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete document");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFile) return alert("Please select a file");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", documentFile);
      await api.post(`/candidates/${id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadModal(false);
      setDocumentFile(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDisconnectAgent = async (agentId: number) => {
    if (!confirm("Disconnect this agent from candidate?")) return;
    try {
      await api.delete(`/candidates/${id}/agents/${agentId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to disconnect agent");
    }
  };

  const handleDisconnectEmployer = async (employerId: number) => {
    if (!confirm("Disconnect this employer from candidate?")) return;
    try {
      await api.delete(`/employers/${employerId}/candidates/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to disconnect employer");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!candidate)
    return <div className="p-8 text-center">Candidate not found</div>;
  const connectedAgents = Array.isArray(candidate.connected_agents)
    ? candidate.connected_agents
    : [];
  const uniqueConnectedAgents = connectedAgents
    .filter(
      (agent: any, index: number, arr: any[]) =>
        index === arr.findIndex((a: any) => Number(a.id) === Number(agent.id)),
    )
    .sort((a: any, b: any) => {
      if (Number(a.id) === Number(candidate.agent_id)) return -1;
      if (Number(b.id) === Number(candidate.agent_id)) return 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

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
        <div className="flex items-center space-x-3">
          {["super_admin", "admin"].includes(user?.role || "") &&
            !candidate?.agent_id && (
            <button
              onClick={() => setShowAssignAgentModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Assign Agent</span>
            </button>
            )}
          {!["accountant", "agent"].includes(user?.role || "") && (
            <Link
              to={`/candidates/${id}/edit`}
              className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-semibold hover:bg-slate-200 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold shadow-lg">
                {candidate.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {candidate.name}
              </h2>
              <p className="text-slate-500 text-sm font-mono">
                {candidate.passport_number}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Phone</span>
                <span className="text-slate-900 font-medium">
                  {candidate.phone}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900 font-medium">
                  {candidate.email || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium capitalize">
                  {candidate.status}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Connected Agents
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  {uniqueConnectedAgents.length}
                </span>
              </div>

              {uniqueConnectedAgents.length === 0 ? (
                <p className="text-sm text-slate-500">No agent connected yet.</p>
              ) : (
                <div className="space-y-2">
                  {uniqueConnectedAgents.map((agent: any) => (
                    <div
                      key={`${agent.id}-${agent.connection_date || agent.name}`}
                      className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/agents/${agent.id}`} className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {agent.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {agent.email}
                          </p>
                        </Link>
                        {["super_admin", "admin"].includes(user?.role || "") && (
                          <button
                            type="button"
                            onClick={() => handleDisconnectAgent(Number(agent.id))}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                            title="Disconnect agent"
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

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Connected Employers
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  {candidate.connected_employers?.length || 0}
                </span>
              </div>

              {!candidate.connected_employers ||
              candidate.connected_employers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No employer connected yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {candidate.connected_employers.map((employer: any) => (
                    <div
                      key={`${employer.id}-${employer.connection_date}`}
                      className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/employers/${employer.id}`} className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {employer.company_name}
                            </span>
                          </div>
                          {employer.position && (
                            <p className="text-xs text-slate-500 mt-1">
                              Position: {employer.position}
                            </p>
                          )}
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Main Documents
              </h3>
              {candidate.passport_copy_url && (
                <a
                  href={candidate.passport_copy_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    <span className="text-sm text-slate-700">
                      Passport Copy
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                </a>
              )}
              {candidate.cv_url && (
                <a
                  href={candidate.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    <span className="text-sm text-slate-700">CV / Resume</span>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Ledger & Documents */}
        <div className="lg:col-span-2 space-y-6">
                    {/* Additional Documents */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Additional Documents
              </h2>
              {["super_admin", "admin", "agent"].includes(user?.role || "") && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {!candidate.additional_documents ||
            candidate.additional_documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.additional_documents.map((doc: any) => (
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
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-all"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      {["super_admin", "admin"].includes(
                        user?.role || "",
                      ) && (
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
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          </div>
        </div>
      )}

      <AssignAgentModal
        candidateId={Number(id)}
        candidateName={candidate.name}
        currentAgentId={candidate.agent_id || 0}
        currentAgentName={candidate.agent_name || "N/A"}
        excludedAgentIds={uniqueConnectedAgents.map((a: any) => Number(a.id))}
        isOpen={showAssignAgentModal}
        onClose={() => setShowAssignAgentModal(false)}
        onAssign={fetchData}
      />
    </div>
  );
};

export default CandidateProfile;


