import { useState, useEffect } from 'react';
import { Box, Typography, Container, Alert, CircularProgress, Card, CardMedia, CardContent } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getScratchEmbedUrl, getDefaultScratchThumbnail } from '../../utils/helpers';
import { fetchScratchProject } from '../../services/gamesService';
import type { ScratchProject } from '../../types';

/**
 * Game Page - Embeds and displays a single Scratch game
 * Accessible only after login
 * 
 * The game is identified by the gameId parameter in the URL route (/game/:gameId)
 * 
 * Features:
 * - Fetches game metadata (title and thumbnail) from Scratch API
 * - Displays game title and thumbnail before loading the game
 * - Embeds the Scratch game in an iframe
 * - Handles errors gracefully with user-friendly messages
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
  const [projectData, setProjectData] = useState<ScratchProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const loadProjectData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const project = await fetchScratchProject(gameId);
        if (project) {
          setProjectData(project);
        } else {
          // API failed, but we can still show the game with fallback data
          setError('Could not load game details from Scratch API. Game will still be playable.');
        }
      } catch (err) {
        console.error('Error loading Scratch project:', err);
        setError('Failed to load game details. Game will still be playable.');
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [gameId]);

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
  const thumbnailUrl = projectData?.image || getDefaultScratchThumbnail(gameId);
  const gameTitle = projectData?.title || `Scratch Game ${gameId}`;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        {/* Game Info Card */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Thumbnail */}
            <CardMedia
              component="img"
              sx={{ 
                width: { xs: '100%', md: 250 }, 
                height: { xs: 200, md: 'auto' },
                objectFit: 'cover' 
              }}
              image={thumbnailUrl}
              alt={gameTitle}
            />
            
            {/* Game Details */}
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom>
                {gameTitle}
              </Typography>
              
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading game details...
                  </Typography>
                </Box>
              )}
              
              {error && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
              
              {projectData && (
                <>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Scratch Project ID: {gameId}
                  </Typography>
                  
                  {projectData.description && (
                    <Typography variant="body2" paragraph>
                      {projectData.description}
                    </Typography>
                  )}
                  
                  {projectData.instructions && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Instructions:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {projectData.instructions}
                      </Typography>
                    </Box>
                  )}
                  
                  {projectData.author && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                      Created by: {projectData.author.username}
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Box>
        </Card>
        
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
