import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('student' | 'teacher' | 'admin')[];
}

/**
 * ProtectedRoute - Wrapper component for role-based access control
 * Redirects unauthorized users to login page
 */
function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ error: t('errors.pleaseLoginBilingual') }} />;
  }

  // If authenticated but role not allowed, redirect to login with error
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace state={{ error: t('errors.noPermissionBilingual') }} />;
  }

  // If authenticated and role is allowed, render children
  return <>{children}</>;
}

export default ProtectedRoute;
