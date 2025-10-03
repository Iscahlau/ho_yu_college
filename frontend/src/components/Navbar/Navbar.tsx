import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Navbar component - Displays school badge, title, user info, and auth buttons
 */
function Navbar() {
  const { t } = useTranslation();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('app.title')} - {t('app.schoolName')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body1">
            {/* User name and marks will be displayed here */}
          </Typography>
          <Button color="inherit">
            {t('nav.login')}
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
