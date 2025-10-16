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
            top: 20,
            right: '-25%',
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
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, position: 'relative' }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}

export default Layout;
