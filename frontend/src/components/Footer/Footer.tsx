import { Box, Container, Typography, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Footer component - Displays footer information with green background
 */
function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#4CAF50',
        color: 'white',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              Copyright© 2025 {t('footer.schoolName')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
              <Typography variant="body2" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              {t('footer.termsOfService')}
              </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default Footer;
