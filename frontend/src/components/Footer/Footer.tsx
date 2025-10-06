import { Box, Typography, Container } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Footer component - Green footer section with copyright info
 */
function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#4CAF50',
        color: 'white',
        py: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" align="center">
          {t('footer.copyright')}
        </Typography>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          {t('footer.createdBy')}
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer;
