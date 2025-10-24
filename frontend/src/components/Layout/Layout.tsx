import { useState, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Navbar from '../Navbar';
import Footer from '../Footer';
import PlayTimeAlert from '../PlayTimeAlert';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { resetPlayTimer } from '../../store/slices/authSlice';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component - Wraps pages with navbar and common structure
 */
function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loginTime } = useAppSelector((state) => state.auth);
  const [showAlert, setShowAlert] = useState(false);

  // Track play time and show alert after 1 hour for student accounts
  useEffect(() => {
    // Only track for authenticated student users
    if (!isAuthenticated || !user || user.role !== 'student' || !loginTime) {
      return;
    }

    // Check play time every minute
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsedTime = now - loginTime;
      const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

      // Show alert if 1 hour has passed
      if (elapsedTime >= oneHourInMs) {
        setShowAlert(true);
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(intervalId);
  }, [isAuthenticated, user, loginTime]);

  const handleCloseAlert = () => {
    setShowAlert(false);
    // Reset the play timer to start counting from 0 again
    dispatch(resetPlayTimer());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#16D3F9', position: 'relative', overflow: 'hidden' }}>
      {/* Rainbow background image - desktop only */}
      {isDesktop && (
        <Box
          sx={{
            position: 'fixed',
            top: 10,
            right: '-20%',
            width: '900px',
            height: '900px',
            backgroundImage: 'url(/assets/images/rainbow.png)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'top right',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
      </Box>
      <Box component="main" sx={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
        {children}
      </Box>
      <Footer />
      
      {/* Play time alert for student accounts */}
      <PlayTimeAlert open={showAlert} onClose={handleCloseAlert} />
    </Box>
  );
}

export default Layout;
