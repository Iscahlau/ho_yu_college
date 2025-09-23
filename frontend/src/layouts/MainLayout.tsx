import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { Language as LanguageIcon, School as SchoolIcon } from '@mui/icons-material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  studentName?: string;
  isAdmin?: boolean;
}

export function MainLayout({ 
  children, 
  showNavigation = false, 
  studentName,
  isAdmin = false 
}: MainLayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    handleLanguageMenuClose();
  };

  const handleLogout = () => {
    // TODO: Implement logout logic
    navigate('/');
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <SchoolIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Ho Yu College - Scratch Game Platform
          </Typography>

          {showNavigation && (
            <>
              <Button color="inherit" onClick={() => navigate('/games')}>
                {t('nav.games')}
              </Button>
              
              {isAdmin && (
                <Button color="inherit" onClick={() => navigate('/admin')}>
                  {t('nav.admin')}
                </Button>
              )}

              {studentName && (
                <Typography variant="body1" sx={{ mr: 2 }}>
                  Welcome, {studentName}
                </Typography>
              )}

              <IconButton color="inherit" onClick={handleLanguageMenuOpen}>
                <LanguageIcon />
              </IconButton>

              <Button color="inherit" onClick={handleLogout}>
                {t('nav.logout')}
              </Button>
            </>
          )}

          {!showNavigation && (
            <IconButton color="inherit" onClick={handleLanguageMenuOpen}>
              <LanguageIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={langMenuAnchor}
        open={Boolean(langMenuAnchor)}
        onClose={handleLanguageMenuClose}
      >
        <MenuItem onClick={() => handleLanguageChange('en')}>
          English
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('zh')}>
          中文
        </MenuItem>
      </Menu>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}