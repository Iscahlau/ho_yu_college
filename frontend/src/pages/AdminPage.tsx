import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Input,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../layouts/MainLayout';

export function AdminPage() {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleBulkUpload = () => {
    if (selectedFile) {
      // TODO: Implement bulk upload logic
      console.log('Uploading file:', selectedFile.name);
    }
  };

  const handleDownloadData = () => {
    // TODO: Implement download activity data logic
    console.log('Downloading activity data...');
  };

  return (
    <MainLayout showNavigation isAdmin>
      <Container maxWidth="lg">
        <Typography variant="h2" gutterBottom>
          {t('admin.title')}
        </Typography>

        <Grid container spacing={3}>
          {/* File Upload Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <UploadIcon sx={{ mr: 1 }} />
                  <Typography variant="h5">
                    {t('admin.bulkUpload')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Upload Excel or CSV files to add or update student information and games.
                </Typography>
                
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  inputProps={{ 
                    accept: '.xlsx,.xls,.csv',
                    'aria-label': 'Upload file'
                  }}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                
                {selectedFile && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Selected: {selectedFile.name}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={handleBulkUpload}
                  disabled={!selectedFile}
                  fullWidth
                >
                  {t('admin.uploadFile')}
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Student Management */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <GroupIcon sx={{ mr: 1 }} />
                  <Typography variant="h5">
                    Student Management
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Manage individual student records, scores, and game access.
                </Typography>
              </CardContent>
              <CardActions sx={{ flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  fullWidth
                >
                  {t('admin.addStudent')}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                >
                  {t('admin.updateStudent')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                >
                  {t('admin.deleteStudent')}
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Data Export */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DownloadIcon sx={{ mr: 1 }} />
                  <Typography variant="h5">
                    Data Export
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Download activity data, game scores, and usage statistics. 
                  Configure which columns to include in the export.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadData}
                  color="secondary"
                >
                  {t('admin.downloadData')}
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Platform Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      42
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Students
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      3
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available Games
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      156
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Games Played Today
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      89%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Students
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
}