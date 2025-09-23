import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import type { LoginCredentials } from '../types';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    studentId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual authentication
      // Mock authentication for now
      if (credentials.studentId && credentials.password) {
        // Check if admin login
        if (credentials.studentId === 'admin' && credentials.password === 'admin') {
          navigate('/admin');
        } else {
          // Regular student login
          navigate('/games');
        }
      } else {
        setError(t('login.invalidCredentials'));
      }
    } catch (err) {
      setError(t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <MainLayout>
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              {t('login.title')}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="studentId"
                label={t('login.studentId')}
                name="studentId"
                autoComplete="username"
                autoFocus
                value={credentials.studentId}
                onChange={handleInputChange('studentId')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label={t('login.password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={handleInputChange('password')}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    value={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    color="primary"
                  />
                }
                label={t('login.showPassword')}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? t('common.loading') : t('login.loginButton')}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    </MainLayout>
  );
}