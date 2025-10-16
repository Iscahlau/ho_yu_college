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
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#16D3F9', position: 'relative', overflow: 'hidden' }}>
      {/* Rainbow background image - desktop only */}
      {isDesktop && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: '-50%',
            width: '800px',
            height: '800px',
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
    </Box>
  );
}

export default Layout;
