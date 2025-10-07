import {AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItem, ListItemText, useTheme, useMediaQuery, Divider} from '@mui/material';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {useAppSelector, useAppDispatch} from '../../store/hooks';
import {logout} from '../../store/slices/authSlice';
import {logout as authServiceLogout} from '../../services/authService';
import PermIdentityOutlinedIcon from '@mui/icons-material/PermIdentityOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import {useState} from 'react';

/**
 * Navbar component - Displays school badge, title, user info, and auth buttons
 * Responsive design: transforms to App Bar with hamburger menu on mobile
 */
function Navbar() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {user, isAuthenticated} = useAppSelector((state) => state.auth);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        authServiceLogout();
        dispatch(logout());
        navigate('/');
        setMobileMenuOpen(false);
    };

    const handleLogin = () => {
        navigate('/login');
        setMobileMenuOpen(false);
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'zh' : 'en';
        i18n.changeLanguage(newLang);
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <>
            <AppBar
                position="static"
                sx={{
                    backgroundColor: '#9575CD',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                <Toolbar sx={{justifyContent: 'space-between', py: 0.5}}>
                    {/* Left section - Hamburger Menu (Mobile) and School Logo */}
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        {isMobile && (
                            <IconButton
                                color="inherit"
                                onClick={toggleMobileMenu}
                                edge="start"
                                sx={{ mr: 1 }}
                                aria-label="menu"
                            >
                                <MenuIcon />
                            </IconButton>
                        )}
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                            <img
                                src="/assets/images/hoyu_logo_light-400x85.png"
                                alt="Ho Yu College Logo"
                                style={{height: isMobile ? '40px' : '50px', marginRight: isMobile ? '8px' : '12px'}}
                            />
                        </Box>
                    </Box>

                    {/* Center section - Title */}
                    <Typography
                        variant={isMobile ? "h6" : "h4"}
                        component="div"
                        sx={{
                            flexGrow: 1,
                            textAlign: 'center',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            color: 'white'
                        }}
                    >
                        {t('app.title')}
                    </Typography>

                    {/* Right section - User info and buttons (Desktop only) */}
                    {!isMobile && (
                        <Box sx={{
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'center',
                            justifyContent: 'flex-end'
                        }}>
                            {/* Desktop: Show user info inline */}
                            {isAuthenticated && user && (
                                <Typography variant="body1" sx={{fontWeight: 500, whiteSpace: 'nowrap', mr: 1}} id='user-info'>
                                    <PermIdentityOutlinedIcon sx={{verticalAlign: 'middle', mr: 0.5}} /> 
                                    {user.name2} {user.id} {t('nav.marks')}:{user.marks}
                                </Typography>
                            )}

                            <Button
                                color="inherit"
                                onClick={toggleLanguage}
                                sx={{
                                    minWidth: 'auto',
                                    px: 1.5,
                                    fontSize: '0.875rem',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.1)'
                                    }
                                }}
                            >
                                {i18n.language === 'en' ? '中文' : 'English'}
                            </Button>
                            {isAuthenticated ? (
                                <Button
                                    color="inherit"
                                    onClick={handleLogout}
                                    sx={{
                                        px: 2.5,
                                        fontSize: '0.875rem',
                                        borderRadius: '20px',
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255,255,255,0.3)'
                                        }
                                    }}
                                >
                                    {t('nav.logout')}
                                </Button>
                            ) : (
                                <Button
                                    color="inherit"
                                    onClick={handleLogin}
                                    sx={{
                                        px: 2.5,
                                        fontSize: '0.875rem',
                                        borderRadius: '20px',
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255,255,255,0.3)'
                                        }
                                    }}
                                >
                                    {t('nav.login')}
                                </Button>
                            )}
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer Menu */}
            <Drawer
                anchor="left"
                open={mobileMenuOpen}
                onClose={toggleMobileMenu}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 280,
                        backgroundColor: '#f5f5f5'
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#9575CD' }}>
                        {t('app.title')}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {/* User info section (when authenticated) */}
                    {isAuthenticated && user && (
                        <>
                            <List>
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                                                    <PermIdentityOutlinedIcon sx={{ mr: 1, color: '#9575CD' }} />
                                                    {user.name2}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                                    ID: {user.id}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                                    {t('nav.marks')}: {user.marks}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            </List>
                            <Divider sx={{ my: 2 }} />
                        </>
                    )}
                    
                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={toggleLanguage}
                            sx={{
                                borderColor: '#9575CD',
                                color: '#9575CD',
                                '&:hover': {
                                    borderColor: '#7E57C2',
                                    backgroundColor: 'rgba(149, 117, 205, 0.1)'
                                }
                            }}
                        >
                            {i18n.language === 'en' ? '中文' : 'English'}
                        </Button>
                        {isAuthenticated ? (
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleLogout}
                                sx={{
                                    backgroundColor: '#9575CD',
                                    '&:hover': {
                                        backgroundColor: '#7E57C2'
                                    }
                                }}
                            >
                                {t('nav.logout')}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleLogin}
                                sx={{
                                    backgroundColor: '#9575CD',
                                    '&:hover': {
                                        backgroundColor: '#7E57C2'
                                    }
                                }}
                            >
                                {t('nav.login')}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Drawer>
        </>
    );
}

export default Navbar;
