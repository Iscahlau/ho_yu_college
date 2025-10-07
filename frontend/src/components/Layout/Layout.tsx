import { Box } from '@mui/material';
import Navbar from '../Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component - Wraps pages with navbar and common structure
 */
function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#16D3F9' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
