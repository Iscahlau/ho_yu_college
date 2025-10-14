import { Box, useTheme, useMediaQuery } from '@mui/material';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component - Wraps pages with navbar and common structure
 */
function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isWideScreen = useMediaQuery(theme.breakpoints.up('md')); // ≥900px

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', 
        backgroundColor: '#16D3F9',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Rainbow background - desktop only */}
      {isWideScreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '25vw',
            height: '33.33vh',
            backgroundImage: 'url(/assets/images/rainbow-left.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top right',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.85
          }}
        />
      )}
      
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}

export default Layout;
