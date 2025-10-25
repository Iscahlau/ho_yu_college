import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PlayTimeAlertProps {
  open: boolean;
  onClose: () => void;
}

/**
 * PlayTimeAlert - Displays a centered alert modal after 1 hour of play time
 * Only shown for student accounts
 */
function PlayTimeAlert({ open, onClose }: PlayTimeAlertProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="play-time-alert-title"
      aria-describedby="play-time-alert-description"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          padding: 2,
        }
      }}
    >
      <DialogTitle id="play-time-alert-title" sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem' }}>
        ⏰
      </DialogTitle>
      <DialogContent>
        <Typography id="play-time-alert-description" variant="body1" sx={{ textAlign: 'center', fontSize: '1.1rem' }}>
          {t('timer.warning')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          size="large"
          sx={{
            px: 4,
            py: 1,
            borderRadius: 2,
            fontWeight: 'bold',
            textTransform: 'none',
          }}
        >
          {t('timer.continue')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PlayTimeAlert;
