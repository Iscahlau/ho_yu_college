import {AppBar, Toolbar, Typography, Button, Box} from '@mui/material';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {useAppSelector, useAppDispatch} from '../../store/hooks';
import {logout} from '../../store/slices/authSlice';
import PermIdentityOutlinedIcon from '@mui/icons-material/PermIdentityOutlined';

/**
 * Navbar component - Displays school badge, title, user info, and auth buttons
 */
function Navbar() {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {user, isAuthenticated} = useAppSelector((state) => state.auth);

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
        <AppBar
            position="static"
            sx={{
                backgroundColor: '#9575CD',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
            <Toolbar sx={{justifyContent: 'space-between', py: 0.5}}>
                {/* Left section - School Logo */}
                <Box sx={{display: 'flex', alignItems: 'center', minWidth: '200px'}}>
                    <img
                        src="/assets/images/hoyu_logo_light-400x85.png"
                        alt="Ho Yu College Logo"
                        style={{height: '50px', marginRight: '12px'}}
                    />
                </Box>

                {/* Center section - Title */}
                <Typography
                    variant="h4"
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

                {/* Right section - User info and buttons */}
                <Box sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    minWidth: '200px',
                    justifyContent: 'flex-end'
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
                <Box>
                    {isAuthenticated && user && (
                        <Typography variant="body1" sx={{fontWeight: 500, whiteSpace: 'nowrap'}} id='user-info'>
                            <PermIdentityOutlinedIcon /> {user.name2} {user.id} {t('nav.marks')}:{user.marks}
                        </Typography>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Navbar;
