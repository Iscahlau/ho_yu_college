import { useState } from 'react';
import { Box, Typography, Container, TextField, Button, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login as loginAction } from '../../store/slices/authSlice';
import { login } from '../../services/authService';

/**
 * Login Page - Handles student and teacher authentication
 */
function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(id, password);

      if (response.success && response.data) {
        const { user, role } = response.data;

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
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" align="center" gutterBottom>
            Login
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Enter your Student ID or Teacher ID to continue
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="id"
              label="Student ID / Teacher ID"
              name="id"
              autoComplete="username"
              autoFocus
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
