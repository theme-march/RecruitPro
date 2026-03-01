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
  UserPlus,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit2,
  Plus,
  X,
  BriefcaseBusiness,
  Target,
  Eye,
} from "lucide-react";

const EmployerProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employer, setEmployer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectCandidate, setShowConnectCandidate] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [connectCandidateForm, setConnectCandidateForm] = useState({
    candidateId: "",
    vacancyId: "",
    salary: "",
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
      const [empRes, candidatesRes] = await Promise.all([
        api.get(`/employers/${id}`),
        api.get("/candidates"),
      ]);
      setEmployer(empRes.data);
      setCandidates(candidatesRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError("");
    const selectedCandidate = candidates.find(
      (candidate) => String(candidate.id) === connectCandidateForm.candidateId
    );
    if (selectedCandidate && !selectedCandidate.agent_id) {
      setConnectError(
        "This candidate has no assigned agent. Please assign an agent first, then connect with employer."
      );
      return;
    }

    try {
      await api.post(`/employers/${id}/connect-candidate`, {
        employerId: id,
        candidateId: connectCandidateForm.candidateId,
        vacancy_id: connectCandidateForm.vacancyId || null,
        salary: connectCandidateForm.salary,
        joining_date: connectCandidateForm.joining_date,
      });
      setShowConnectCandidate(false);
      setConnectCandidateForm({
        candidateId: "",
        vacancyId: "",
        salary: "",
        joining_date: "",
      });
      fetchData();
    } catch (err: any) {
      setConnectError(
        err.response?.data?.message || "Failed to connect candidate"
      );
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
  const currentEmployerId = Number(id);
  const availableCandidates = candidates.filter((candidate: any) => {
    const connectedEmployerId = candidate.connected_employer_id
      ? Number(candidate.connected_employer_id)
      : null;
    return !connectedEmployerId || connectedEmployerId === currentEmployerId;
  });
  const selectedCandidate = availableCandidates.find(
    (candidate) => String(candidate.id) === connectCandidateForm.candidateId
  );
  const selectedCandidateHasNoAgent =
    !!selectedCandidate && !selectedCandidate.agent_id;
  const vacancies = employer.vacancies || [];
  const connectedCandidates = employer.connected_candidates || [];
  const vacancyStats = vacancies.reduce(
    (acc: { required: number; filled: number }, vacancy: any) => ({
      required: acc.required + Number(vacancy.required_count || 0),
      filled: acc.filled + Number(vacancy.filled_count || 0),
    }),
    { required: 0, filled: 0 }
  );
  const vacancyAssignments = connectedCandidates.reduce(
    (acc: Record<number, any[]>, candidate: any) => {
      const vacancyId = Number(candidate.vacancy_id || 0);
      if (!vacancyId) return acc;
      if (!acc[vacancyId]) acc[vacancyId] = [];
      acc[vacancyId].push(candidate);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to List</span>
      </button>
      <div className="bg-white rounded-2xl shadow overflow-hidden">
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
      <div className="bg-white rounded-2xl shadow p-6 border border-indigo-100/70">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BriefcaseBusiness className="w-5 h-5 text-indigo-600" />
            Vacancy Plan ({vacancies.length})
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              Need: {vacancyStats.required}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              Filled: {vacancyStats.filled}
            </span>
          </div>
        </div>
        {vacancies.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vacancies.map((vacancy: any) => {
              const required = Number(vacancy.required_count || 0);
              const filled = Number(vacancy.filled_count || 0);
              const progress =
                required > 0 ? Math.min(100, Math.round((filled / required) * 100)) : 0;
              const assignedCandidates = vacancyAssignments[Number(vacancy.id)] || [];
              return (
                <div
                  key={vacancy.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">{vacancy.job_title}</p>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span>
                      Required: <span className="font-medium">{required}</span> - Filled:{" "}
                      <span className="font-medium text-emerald-600">{filled}</span>
                    </span>
                  </div>
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Selected People ({assignedCandidates.length})
                    </p>
                    {assignedCandidates.length ? (
                      <div className="flex flex-wrap gap-2">
                        {assignedCandidates.map((candidate: any) => (
                          <Link
                            key={candidate.id}
                            to={`/candidates/${candidate.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                          >
                            {candidate.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No candidate assigned yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5">
            No vacancy set for this employer.
          </p>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow p-6 border border-green-100/70">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-green-600" />
            Connected Candidates ({connectedCandidates.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => {
                setConnectError("");
                setShowConnectCandidate(true);
              }}
              className="p-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors shadow-sm"
              title="Connect Candidate"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {connectedCandidates.length === 0 ? (
            <p className="text-center text-gray-500 py-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
              No candidates connected
            </p>
          ) : (
            connectedCandidates.map((candidate: any) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-green-50/40 border border-green-100 rounded-xl hover:shadow-sm transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-base">{candidate.name}</p>
                    <p className="text-xs text-gray-600">
                      Job: {candidate.vacancy_title || candidate.position || "N/A"} • Agent: {candidate.agent_name || "Unassigned"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Passport: {candidate.passport_number || "N/A"} • Status: {candidate.status || "applied"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/candidates/${candidate.id}`}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleDisconnectCandidate(candidate.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Disconnect Candidate"
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
      <div className="bg-white rounded-2xl shadow p-6">
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
      {showConnectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Connect Candidate
              </h3>
              <button
                onClick={() => {
                  setConnectError("");
                  setShowConnectCandidate(false);
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleConnectCandidate} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  ✓ Agent will be automatically connected when you add their
                  candidate
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Candidate
                </label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                  value={connectCandidateForm.candidateId}
                  onChange={(e) =>
                    setConnectCandidateForm({
                      ...connectCandidateForm,
                      candidateId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    {availableCandidates.length
                      ? "-- Select Candidate --"
                      : "-- No available candidates --"}
                  </option>
                  {availableCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.passport_number}) - Agent: {candidate.agent_name || "Unassigned"}
                    </option>
                  ))}
                </select>
                {selectedCandidateHasNoAgent && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-2">
                    <p>
                      This candidate has no assigned agent. Please assign an agent first, then connect.
                    </p>
                    <Link
                      to={`/candidates/${selectedCandidate.id}`}
                      className="inline-flex items-center text-blue-700 hover:text-blue-800 font-medium underline"
                    >
                      View Candidate Profile
                    </Link>
                  </div>
                )}
                {connectError && (
                  <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {connectError}
                  </p>
                )}
              </div>
              {(employer.vacancies?.length || 0) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Vacancy / Job
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                    value={connectCandidateForm.vacancyId}
                    onChange={(e) =>
                      setConnectCandidateForm({
                        ...connectCandidateForm,
                        vacancyId: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Select Job --</option>
                    {employer.vacancies.map((vacancy: any) => (
                      <option key={vacancy.id} value={vacancy.id}>
                        {vacancy.job_title} (Need: {vacancy.required_count}, Filled: {vacancy.filled_count || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                    value={connectCandidateForm.salary}
                    onChange={(e) =>
                      setConnectCandidateForm({
                        ...connectCandidateForm,
                        salary: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
                    value={connectCandidateForm.joining_date}
                    onChange={(e) =>
                      setConnectCandidateForm({
                        ...connectCandidateForm,
                        joining_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={selectedCandidateHasNoAgent}
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
                      ? employer.connected_agents
                      : candidates
                    ).map((item: any) => (
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

