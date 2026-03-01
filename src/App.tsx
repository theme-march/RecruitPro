import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CandidateList from './pages/CandidateList';
import AddCandidate from './pages/AddCandidate';
import CandidateProfile from './pages/CandidateProfile';
import EditCandidate from './pages/EditCandidate';
import AgentList from './pages/AgentList';
import AgentProfile from './pages/AgentProfile';
import EditAgent from './pages/EditAgent';
import UserManagement from './pages/UserManagement';
import EmployerList from './pages/EmployerList';
import AddEmployer from './pages/AddEmployer';
import EmployerProfile from './pages/EmployerProfile';
import EditEmployer from './pages/EditEmployer';
import Reports from './pages/Reports';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/candidates" element={<CandidateList />} />
            <Route path="/candidates/new" element={<AddCandidate />} />
            <Route path="/candidates/:id" element={<CandidateProfile />} />
            <Route path="/candidates/:id/edit" element={<EditCandidate />} />
            <Route path="/agents" element={<AgentList />} />
            <Route path="/agents/:id" element={<AgentProfile />} />
            <Route path="/agents/:id/edit" element={<EditAgent />} />
            <Route path="/employers" element={<EmployerList />} />
            <Route path="/employers/new" element={<AddEmployer />} />
            <Route path="/employers/:id" element={<EmployerProfile />} />
            <Route path="/employers/:id/edit" element={<EditEmployer />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
