import { Box, Container, Typography } from '@mui/material';
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
        backgroundColor: '#318B43',
        color: 'white',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            Copyright© 2025 {t('footer.schoolName')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              {t('footer.createdBy')}
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', color: '#E6F094' }}>
              {t('footer.hundredKitStudio')}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default Footer;
