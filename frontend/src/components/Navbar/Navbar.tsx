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
                    backgroundColor: '#BE86CD',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                <Toolbar sx={{justifyContent: 'space-between', py: 0.5, position: 'relative'}}>
                    {/* Left section - Hamburger Menu (Mobile) and School Logo */}
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flex: 1}}>
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
                        variant={isMobile ? "h6" : "h3"}
                        component="div"
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            color: 'white',
                            pointerEvents: 'none'
                        }}
                    >
                        {t('app.title')}
                    </Typography>

                    {/* Right section - Buttons and user info in vertical layout (Desktop only) */}
                    {!isMobile && (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 0.5,
                            flex: 1,
                            pt: 1,
                            pb: 1
                        }}>
                            {/* Row 1: Language toggle and Login/Logout buttons */}
                            <Box sx={{
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center'
                            }}>
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
                                        onClick={handleLogout}
                                        sx={{
                                            px: 2.5,
                                            fontSize: '0.875rem',
                                            borderRadius: '20px',
                                            backgroundColor: '#FFFFFF',
                                            color: '#BE86CD',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255,255,255,0.9)'
                                            }
                                        }}
                                    >
                                        {t('nav.logout')}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleLogin}
                                        sx={{
                                            px: 2.5,
                                            fontSize: '0.875rem',
                                            borderRadius: '20px',
                                            backgroundColor: '#FFFFFF',
                                            color: '#BE86CD',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255,255,255,0.9)'
                                            }
                                        }}
                                    >
                                        {t('nav.login')}
                                    </Button>
                                )}
                            </Box>

                            {/* Row 2: User info (displayed below buttons when authenticated) */}
                            {isAuthenticated && user && (
                                <Typography variant="body1" sx={{fontWeight: 500, whiteSpace: 'nowrap', mt:1}} id='user-info'>
                                    <PermIdentityOutlinedIcon sx={{verticalAlign: 'middle', mr: 0.5}} /> 
                                    {user.role === 'student' ? user.name2 : user.name} {user.id} {user.role === 'student' ? `${t('nav.marks')}:${user.marks}` : ''}
                                </Typography>
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
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#BE86CD' }}>
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
                                                    <PermIdentityOutlinedIcon sx={{ mr: 1, color: '#BE86CD' }} />
                                                    {user.role === 'student' ? user.name2 : user.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                                    ID: {user.id}
                                                </Typography>
                                                {user.role === 'student' && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                                        {t('nav.marks')}: {user.marks}
                                                    </Typography>
                                                )}
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
                                borderColor: '#BE86CD',
                                color: '#BE86CD',
                                '&:hover': {
                                    borderColor: '#A76BB8',
                                    backgroundColor: 'rgba(190, 134, 205, 0.1)'
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
                                    backgroundColor: '#FFFFFF',
                                    color: '#BE86CD',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.9)'
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
                                    backgroundColor: '#FFFFFF',
                                    color: '#BE86CD',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.9)'
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
