import { Box, Typography, Container, Paper, Button, Grid, Card, CardContent, CardActions, Divider, Chip, Alert, Snackbar } from '@mui/material';
import { Upload, Download, CloudUpload, GetApp, People, School, SportsEsports, AdminPanelSettings } from '@mui/icons-material';
import { useAppSelector } from '../../store/hooks';
import { downloadStudentData, downloadTeacherData, downloadGamesData } from '../../services/downloadService';
import { uploadStudentData, uploadTeacherData, uploadGameData } from '../../services/uploadService';
import { validateFileFormat, validateFileSize, countFileRows } from '../../utils/helpers';
import { FILE_UPLOAD_LIMITS } from '../../utils/constants';
import { useState, useRef } from 'react';

/**
 * Admin Page - Management dashboard for teachers and admins
 * Accessible only by teachers and admins
 */
function Admin() {
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  // State for file upload feedback
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Refs for file inputs
  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const gameFileInputRef = useRef<HTMLInputElement>(null);

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Show snackbar message
  const showMessage = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Validate uploaded file
  const validateFile = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Check file format
    if (!validateFileFormat(file)) {
      return {
        valid: false,
        error: `Invalid file format. Only ${FILE_UPLOAD_LIMITS.SUPPORTED_FORMATS.join(', ')} files are supported.`,
      };
    }

    // Check file size
    if (!validateFileSize(file)) {
      return {
        valid: false,
        error: `File size exceeds ${FILE_UPLOAD_LIMITS.MAX_SIZE / (1024 * 1024)} MB limit.`,
      };
    }

    // Check row count
    try {
      const rowCount = await countFileRows(file);
      if (rowCount > FILE_UPLOAD_LIMITS.MAX_ROWS) {
        return {
          valid: false,
          error: `File contains ${rowCount} records. Maximum allowed is ${FILE_UPLOAD_LIMITS.MAX_ROWS} records.`,
        };
      }
      if (rowCount === 0) {
        return {
          valid: false,
          error: 'File is empty or contains no valid data rows.',
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to read file. Please ensure the file is not corrupted.',
      };
    }

    return { valid: true };
  };

  // Handle student file upload
  const handleUploadStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      showMessage(validation.error || 'Invalid file', 'error');
      // Reset file input
      if (studentFileInputRef.current) {
        studentFileInputRef.current.value = '';
      }
      return;
    }

    // Upload file
    showMessage('Uploading student data...', 'info');
    const result = await uploadStudentData(file);
    
    if (result.success) {
      showMessage(result.message, 'success');
    } else {
      showMessage(result.message, 'error');
    }

    // Reset file input
    if (studentFileInputRef.current) {
      studentFileInputRef.current.value = '';
    }
  };

  // Handle teacher file upload (admin only)
  const handleUploadTeachers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      showMessage(validation.error || 'Invalid file', 'error');
      // Reset file input
      if (teacherFileInputRef.current) {
        teacherFileInputRef.current.value = '';
      }
      return;
    }

    // Upload file
    showMessage('Uploading teacher data...', 'info');
    const result = await uploadTeacherData(file);
    
    if (result.success) {
      showMessage(result.message, 'success');
    } else {
      showMessage(result.message, 'error');
    }

    // Reset file input
    if (teacherFileInputRef.current) {
      teacherFileInputRef.current.value = '';
    }
  };

  // Handle game file upload
  const handleUploadGames = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      showMessage(validation.error || 'Invalid file', 'error');
      // Reset file input
      if (gameFileInputRef.current) {
        gameFileInputRef.current.value = '';
      }
      return;
    }

    // Upload file
    showMessage('Uploading game data...', 'info');
    const result = await uploadGameData(file);
    
    if (result.success) {
      showMessage(result.message, 'success');
    } else {
      showMessage(result.message, 'error');
    }

    // Reset file input
    if (gameFileInputRef.current) {
      gameFileInputRef.current.value = '';
    }
  };

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
    <Box sx={{ 
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: '#16D3F9',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AdminPanelSettings sx={{ fontSize: 40, color: '#667eea', mr: 2 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2d3748' }}>
                  Admin Dashboard
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Role: ${user?.role}`} 
                color="primary" 
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label="Dashboard Access" 
                color="success" 
                size="small"
                variant="outlined"
              />
            </Box>
          </Paper>
        </Box>

        {/* Upload Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 2.5, 
              fontWeight: 700, 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <CloudUpload /> Data Upload
          </Typography>
          <Grid container spacing={3}>
            {/* Upload Student Data */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <People sx={{ fontSize: 36, color: '#48bb78', mr: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                      Student Data
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#718096', mb: 2, lineHeight: 1.6 }}>
                    Upload Excel/CSV file to add, update, or delete student records
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label=".xlsx" size="small" variant="outlined" />
                    <Chip label=".csv" size="small" variant="outlined" />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#a0aec0', display: 'block' }}>
                    Max: {FILE_UPLOAD_LIMITS.MAX_ROWS.toLocaleString()} records, {FILE_UPLOAD_LIMITS.MAX_SIZE / (1024 * 1024)} MB
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <input
                    type="file"
                    ref={studentFileInputRef}
                    accept={FILE_UPLOAD_LIMITS.SUPPORTED_FORMATS.join(',')}
                    onChange={handleUploadStudents}
                    style={{ display: 'none' }}
                  />
                  <Button 
                    variant="contained" 
                    startIcon={<Upload />}
                    fullWidth
                    onClick={() => studentFileInputRef.current?.click()}
                    sx={{
                      py: 1.2,
                      fontWeight: 600,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)',
                        transform: 'scale(1.02)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Select File
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Upload Teacher Data - Admin Only */}
            {isAdmin && (
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <School sx={{ fontSize: 36, color: '#ed8936', mr: 1.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                        Teacher Data
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#718096', mb: 2, lineHeight: 1.6 }}>
                      Upload Excel/CSV file to manage teacher accounts
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Chip label="Admin Only" size="small" color="error" />
                      <Chip label=".xlsx" size="small" variant="outlined" />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#a0aec0', display: 'block' }}>
                      Max: {FILE_UPLOAD_LIMITS.MAX_ROWS.toLocaleString()} records, {FILE_UPLOAD_LIMITS.MAX_SIZE / (1024 * 1024)} MB
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <input
                      type="file"
                      ref={teacherFileInputRef}
                      accept={FILE_UPLOAD_LIMITS.SUPPORTED_FORMATS.join(',')}
                      onChange={handleUploadTeachers}
                      style={{ display: 'none' }}
                    />
                    <Button 
                      variant="contained" 
                      startIcon={<Upload />}
                      fullWidth
                      onClick={() => teacherFileInputRef.current?.click()}
                      sx={{
                        py: 1.2,
                        fontWeight: 600,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #dd6b20 0%, #c05621 100%)',
                          transform: 'scale(1.02)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Select File
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )}

            {/* Upload Game List */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SportsEsports sx={{ fontSize: 36, color: '#4299e1', mr: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                      Game List
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#718096', mb: 2, lineHeight: 1.6 }}>
                    Upload Excel/CSV file to add, update, or delete game records
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label=".xlsx" size="small" variant="outlined" />
                    <Chip label=".csv" size="small" variant="outlined" />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#a0aec0', display: 'block' }}>
                    Max: {FILE_UPLOAD_LIMITS.MAX_ROWS.toLocaleString()} records, {FILE_UPLOAD_LIMITS.MAX_SIZE / (1024 * 1024)} MB
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <input
                    type="file"
                    ref={gameFileInputRef}
                    accept={FILE_UPLOAD_LIMITS.SUPPORTED_FORMATS.join(',')}
                    onChange={handleUploadGames}
                    style={{ display: 'none' }}
                  />
                  <Button 
                    variant="contained" 
                    startIcon={<Upload />}
                    fullWidth
                    onClick={() => gameFileInputRef.current?.click()}
                    sx={{
                      py: 1.2,
                      fontWeight: 600,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                        transform: 'scale(1.02)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Select File
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Download Section */}
        <Box>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 2.5, 
              fontWeight: 700, 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <GetApp /> Data Export
          </Typography>
          <Grid container spacing={3}>
            {/* Download Student Data */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <People sx={{ fontSize: 36, color: '#48bb78', mr: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                      Student Data
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#718096', mb: 2, lineHeight: 1.6 }}>
                    {isAdmin 
                      ? 'Download all student data in Excel format' 
                      : 'Download student data for your classes only'}
                  </Typography>
                  <Chip 
                    label="Export Ready" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    variant="contained" 
                    startIcon={<Download />}
                    onClick={handleDownloadStudents}
                    fullWidth
                    sx={{
                      py: 1.2,
                      fontWeight: 600,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        transform: 'scale(1.02)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Download Excel
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Download Teacher Data - Admin Only */}
            {isAdmin && (
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <School sx={{ fontSize: 36, color: '#ed8936', mr: 1.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                        Teacher Data
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#718096', mb: 2, lineHeight: 1.6 }}>
                      Download all teacher data in Excel format
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label="Admin Only" size="small" color="error" />
                      <Chip label="Export Ready" size="small" color="success" variant="outlined" />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button 
                      variant="contained" 
                      startIcon={<Download />}
                      onClick={handleDownloadTeachers}
                      fullWidth
                      sx={{
                        py: 1.2,
                        fontWeight: 600,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          transform: 'scale(1.02)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Download Excel
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )}

            {/* Download Games Data */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SportsEsports sx={{ fontSize: 36, color: '#4299e1', mr: 1.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                      Games Data
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#718096', mb: 2, lineHeight: 1.6 }}>
                    Download all game records in Excel format
                  </Typography>
                  <Chip 
                    label="Export Ready" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                </CardContent>
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button 
                    variant="contained" 
                    startIcon={<Download />}
                    onClick={handleDownloadGames}
                    fullWidth
                    sx={{
                      py: 1.2,
                      fontWeight: 600,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        transform: 'scale(1.02)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Download Excel
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Snackbar for user feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Admin;
