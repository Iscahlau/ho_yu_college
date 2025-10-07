import { Box, Typography, Container, Paper, Button, Stack, Alert } from '@mui/material';
import { Upload, Download } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { downloadStudentData, downloadTeacherData, downloadGamesData } from '../../services/downloadService';

/**
 * Admin Page - Management dashboard for teachers and admins
 * Accessible only by teachers and admins
 */
function Admin() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  // Handle download student data
  const handleDownloadStudents = async () => {
    try {
      // Teachers can only download their own class data
      const classFilter = isAdmin ? undefined : user?.responsibleClasses;
      await downloadStudentData(classFilter);
      // Note: Actual file download implementation would be added here
      alert('Student data download initiated');
    } catch (error) {
      alert('Failed to download student data');
      console.error(error);
    }
  };

  // Handle download teacher data (admin only)
  const handleDownloadTeachers = async () => {
    try {
      await downloadTeacherData();
      alert('Teacher data download initiated');
    } catch (error) {
      alert('Failed to download teacher data');
      console.error(error);
    }
  };

  // Handle download games data
  const handleDownloadGames = async () => {
    try {
      await downloadGamesData();
      alert('Games data download initiated');
    } catch (error) {
      alert('Failed to download games data');
      console.error(error);
    }
  };

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

          {/* Upload Teacher Data - Admin Only */}
          {isAdmin && (
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
          )}

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

          {/* Download Student Data */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Download Student Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isAdmin 
                ? 'Download all student data' 
                : 'Download student data for your classes only'}
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Download />}
              onClick={handleDownloadStudents}
            >
              Download Excel
            </Button>
          </Paper>

          {/* Download Teacher Data - Admin Only */}
          {isAdmin && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Download Teacher Data
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download all teacher data (Admin only)
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<Download />}
                onClick={handleDownloadTeachers}
              >
                Download Excel
              </Button>
            </Paper>
          )}

          {/* Download Games Data */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Download Games Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Download all game records
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Download />}
              onClick={handleDownloadGames}
            >
              Download Excel
            </Button>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}

export default Admin;
