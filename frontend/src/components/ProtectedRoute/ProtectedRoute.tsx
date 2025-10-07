import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('student' | 'teacher' | 'admin')[];
}

/**
 * ProtectedRoute - Wrapper component for role-based access control
 * Redirects unauthorized users to login page
 */
function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ error: 'Please log in to access this page.' }} />;
  }

  // If authenticated but role not allowed, redirect to login with error
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace state={{ error: 'You do not have permission to access this page.' }} />;
  }

  // If authenticated and role is allowed, render children
  return <>{children}</>;
}

export default ProtectedRoute;
