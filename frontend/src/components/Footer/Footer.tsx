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
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: { xs: 'center', md: 'space-between' },
            alignItems: 'center',
            gap: { xs: 1, md: 0 },
          }}
        >
          <Typography variant="body2" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
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
            <Typography variant="body2">
              {t('footer.createdBy')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#E6F094' }}>
              {t('footer.hundredKitStudio')}.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default Footer;
