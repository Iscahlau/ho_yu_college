import {useState} from 'react';
import {Box, Typography, Container, TextField, Button, Paper, Alert, Checkbox, Link} from '@mui/material';
import {useNavigate} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {login as loginAction} from '../../store/slices/authSlice';
import {login} from '../../services/authService';

/**
 * Login Page - Handles student and teacher authentication
 */
function Login() {
    const { t } = useTranslation();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await login(id, password);

            if (response.success && response.data) {
                const {user, role} = response.data;

                if (user) {
                    // Store user in Redux
                    dispatch(loginAction({
                        id: role === 'student' ? (user as any).student_id : (user as any).teacher_id,
                        name1: (user as any).name_1 || '',
                        name2: (user as any).name_2 || '',
                        marks: (user as any).marks || 0,
                        role,
                        class: (user as any).class,
                        responsibleClasses: (user as any).responsible_class,
                    }));

                    // Clear error before redirecting
                    setError('');

                    // Redirect based on role
                    if (role === 'student') {
                        navigate('/');
                    } else {
                        navigate('/admin');
                    }
                }
            } else {
                setError(response.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{
                mt: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '60vh',
                justifyContent: 'center'
            }}>
                <Paper
                    elevation={6}
                    sx={{
                        p: 4,
                        width: '100%',
                        maxWidth: 400,
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, #89B5E1 0%, #A896D8 100%)',
                    }}
                >
                    <Typography
                        variant="h4"
                        align="center"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            color: '#000',
                            mb: 3
                        }}
                    >
                        {t('login.title')}
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{mb: 2}}>
                            {error}
                        </Alert>
                    )}
                    <Box component="form" onSubmit={handleSubmit} sx={{mt: 2}}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="id"
                            name="id"
                            autoComplete="username"
                            autoFocus
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            disabled={loading}
                            placeholder={t('login.loginPrompt')}
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'white',
                                    borderRadius: 2,
                                    '& fieldset': {
                                        borderColor: 'transparent',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'transparent',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'transparent',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    padding: '12px 16px',
                                },
                            }}
                        />
                        <Box sx={{position: 'relative', mb: 2}}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                type={showPassword ? "text" : "password"}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                placeholder={t('login.passwordPrompt')}
                                sx={{
                                    mb: 0,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'white',
                                        borderRadius: 2,
                                        paddingRight: '48px',
                                        '& fieldset': {
                                            borderColor: 'transparent',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'transparent',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'transparent',
                                        },
                                    },
                                    '& .MuiInputBase-input': {
                                        padding: '12px 16px',
                                    },
                                }}
                            />
                            <Checkbox
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#666',
                                    '&.Mui-checked': {
                                        color: '#666',
                                    },
                                }}
                            />
                        </Box>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 2,
                                mb: 1,
                                py: 1.5,
                                backgroundColor: '#E89158',
                                borderRadius: 2,
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#D97F47',
                                },
                                '&:disabled': {
                                    backgroundColor: '#D4A987',
                                },
                            }}
                        >
                            {loading ? `${t('login.loginButton')}...` : t('login.loginButton')}
                        </Button>
                        <Box sx={{textAlign: 'right', mt: 1}}>
                            <Link
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    // TODO: Implement forgot password functionality
                                }}
                                sx={{
                                    color: '#000',
                                    fontSize: '0.875rem',
                                    textDecoration: 'none',
                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                忘記密碼?
                            </Link>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
}

export default Login;
