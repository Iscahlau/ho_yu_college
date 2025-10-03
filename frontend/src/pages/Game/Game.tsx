import { Box, Typography, Container } from '@mui/material';

/**
 * Game Page - Embeds and displays a single Scratch game
 * Accessible only after login
 */
function Game() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Game Player
        </Typography>
        <Box
          sx={{
            mt: 2,
            width: '100%',
            height: '600px',
            border: '1px solid #ccc',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
          }}
        >
          <Typography color="text.secondary">
            Scratch game will be embedded here
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default Game;
