import { Box, Typography, Container, TextField, Button, Paper } from '@mui/material';

/**
 * Login Page - Handles student and teacher authentication
 */
function Login() {
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
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="id"
              label="Student ID / Teacher ID"
              name="id"
              autoComplete="username"
              autoFocus
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
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
