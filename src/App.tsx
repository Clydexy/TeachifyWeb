import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import AssignmentsPage from './pages/AssignmentsPage';
import SetupPage from './pages/SetupPage';
import TeacherClass from './pages/TeacherClass';
import TeacherDashboard from './pages/TeacherDashboard';
import { AnimatePresence } from 'framer-motion';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireStudent?: boolean;
}

function ProtectedRoute({ children, requireStudent = true }: ProtectedRouteProps) {
  const location = useLocation();
  const authId = localStorage.getItem('authId');
  const isStudent = localStorage.getItem('isStudent') === 'true';
  
  if (!authId) {
    return <Navigate to="/login" replace />;
  }

  // Special case for chat page when accessed by teacher
  if (location.pathname === '/chat' && location.state?.readOnly) {
    return <>{children}</>;
  }

  if (requireStudent && !isStudent) {
    return <Navigate to="/teacher" replace />;
  }

  if (!requireStudent && isStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const location = useLocation();

  React.useEffect(() => {
    const titles: { [key: string]: string } = {
      '/': 'Teachify - Transform Your Teaching Experience',
      '/login': 'Login | Teachify',
      '/dashboard': 'Dashboard | Teachify',
      '/assignments': 'Assignments | Teachify',
      '/chat': 'AI Chat | Teachify',
      '/setup': 'Setup | Teachify',
      '/teacher': 'Teacher Dashboard | Teachify'
    };
    document.title = titles[location.pathname] || 'Teachify';
  }, [location]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireStudent={true}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute requireStudent={false}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/class/:classId"
          element={
            <ProtectedRoute requireStudent={false}>
              <TeacherClass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute requireStudent={true}>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute requireStudent={true}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;