import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

/**
 * Navbar component - Displays school badge, title, user info, and auth buttons
 */
function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('app.title')} - {t('app.schoolName')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isAuthenticated && user && (
            <Typography variant="body1">
              {user.name1} {user.name2} - {t('nav.marks')}: {user.marks}
            </Typography>
          )}
          <Button color="inherit" onClick={toggleLanguage}>
            {i18n.language === 'en' ? '中文' : 'English'}
          </Button>
          {isAuthenticated ? (
            <Button color="inherit" onClick={handleLogout}>
              {t('nav.logout')}
            </Button>
          ) : (
            <Button color="inherit" onClick={handleLogin}>
              {t('nav.login')}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
