import { Box, Typography, Container, Paper, Button, Stack, Alert } from '@mui/material';
import { Upload, Download } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';

/**
 * Admin Page - Management dashboard for teachers and admins
 * Accessible only by teachers and admins
 */
function Admin() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        {/* User info alert */}
        <Alert severity="success" sx={{ mb: 3 }}>
          Welcome, {user?.name1} {user?.name2}! You are logged in as {user?.role}.
        </Alert>

        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage students, teachers, and game data
        </Typography>

        <Stack spacing={3}>
          {/* Upload Student Data */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Student Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload Excel/CSV file to add, update, or delete student records
            </Typography>
            <Button variant="contained" startIcon={<Upload />}>
              Select File
            </Button>
          </Paper>

          {/* Upload Teacher Data */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Teacher Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload Excel/CSV file to manage teacher accounts (Admin only)
            </Typography>
            <Button variant="contained" startIcon={<Upload />}>
              Select File
            </Button>
          </Paper>

          {/* Upload Game List */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Game List
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload Excel/CSV file to add, update, or delete game records
            </Typography>
            <Button variant="contained" startIcon={<Upload />}>
              Select File
            </Button>
          </Paper>

          {/* Download Activity Data */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Download Activity Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Download student activity data (marks only)
            </Typography>
            <Button variant="contained" startIcon={<Download />}>
              Download Excel
            </Button>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}

export default Admin;
