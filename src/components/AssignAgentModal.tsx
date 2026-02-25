import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "../services/api";

interface Agent {
  id: number;
  name: string;
  email: string;
  candidate_count?: number;
}

interface AssignAgentModalProps {
  candidateId: number;
  candidateName: string;
  currentAgentId: number;
  currentAgentName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssign: () => void;
}

const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  candidateId,
  candidateName,
  currentAgentId,
  currentAgentName,
  isOpen,
  onClose,
  onAssign,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] =
    useState<number>(currentAgentId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(currentAgentId);
      fetchAgents();
    }
  }, [isOpen, currentAgentId]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/agents");
      const resp = response.data;
      const list = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.data)
          ? resp.data
          : [];
      setAgents(list);
      setError("");
    } catch (err) {
      console.error(err);
      setAgents([]);
      setError("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (selectedAgentId === currentAgentId) {
      setError("Please select a different agent");
      return;
    }

    try {
      setLoading(true);
      await api.put(`/candidates/${candidateId}/assign-agent`, {
        candidateId,
        newAgentId: selectedAgentId,
      });
      onAssign();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reassign candidate");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm  bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold">Assign Agent</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Candidate
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{candidateName}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Agent
            </label>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">{currentAgentName}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Agent
            </label>
            {loading && !agents.length ? (
              <div className="text-center py-3 text-gray-600">
                Loading agents...
              </div>
            ) : (
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={currentAgentId}>
                  -- Select Agent --
                </option>
                {agents
                  .filter((a) => a.id !== currentAgentId)
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.candidate_count || 0} candidates)
                    </option>
                  ))}
              </select>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || selectedAgentId === currentAgentId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAgentModal;
