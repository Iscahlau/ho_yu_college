import { Box, Typography, Container, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getScratchEmbedUrl } from '../../utils/helpers';

/**
 * Game Page - Embeds and displays a single Scratch game
 * Accessible only after login
 * 
 * The game is identified by the gameId parameter in the URL route (/game/:gameId)
 * 
 * Usage:
 * - Navigate to /game/{scratchId} where {scratchId} is the Scratch project ID
 * - Example: /game/123456789 will embed https://scratch.mit.edu/projects/123456789/embed
 * 
 * To update which game is displayed:
 * - Change the gameId in the URL route
 * - The gameId should match the Scratch project ID from scratch.mit.edu
 */
function Game() {
  const { gameId } = useParams<{ gameId: string }>();

  // If no gameId is provided, show an error message
  if (!gameId) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            No game ID provided. Please navigate to a valid game URL (e.g., /game/123456789).
          </Alert>
        </Box>
      </Container>
    );
  }

  // Generate the Scratch embed URL using the helper function
  const embedUrl = getScratchEmbedUrl(gameId);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Game Player
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Playing Scratch Project: {gameId}
        </Typography>
        
        {/* Responsive iframe container for Scratch game */}
        <Box
          sx={{
            mt: 2,
            width: '100%',
            position: 'relative',
            paddingBottom: '82.68%', // Aspect ratio 485:402 (402/485 = 82.68%)
            height: 0,
            overflow: 'hidden',
            border: '1px solid #ccc',
            borderRadius: 2,
            bgcolor: '#f5f5f5',
          }}
        >
          <iframe
            src={embedUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
            title={`Scratch Game ${gameId}`}
          />
        </Box>
      </Box>
    </Container>
  );
}

export default Game;
