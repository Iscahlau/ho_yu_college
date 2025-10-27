import { useEffect, useState } from 'react';
import { Box, Container, Alert, Paper, Typography, Chip, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch } from '../../store/store';
import { setGames } from '../../store/slices/gamesSlice';
import { updateMarks } from '../../store/slices/authSlice';
import { getScratchEmbedUrl } from '../../utils/helpers';
import { fetchGames, trackGameClick } from '../../services/gamesService';
import type { Game } from '../../store/slices/gamesSlice';

// API base URL for sendBeacon calls
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Game Page - Embeds and displays a single Scratch game
 * Accessible only after login
 * 
 * The game is identified by the gameId parameter in the URL route (/game/:gameId)
 * 
 * Usage:
 * - Navigate to /game/{scratchId} where {scratchId} is the Scratch project ID
 * - Example: /game/123456789 will embed https://scratch.mit.edu/projects/123456789/embed
 */
function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { games } = useSelector((state: RootState) => state.games);
  const { user } = useSelector((state: RootState) => state.auth);
  const [gameInfo, setGameInfo] = useState<Game | null>(null);
  const [clickTracked, setClickTracked] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [timeSubmitted, setTimeSubmitted] = useState(false);

  // Load games from backend if not already loaded
  useEffect(() => {
    const loadGames = async () => {
      if (games.length === 0) {
        try {
          const response = await fetchGames();
          if (response.success && response.data) {
            dispatch(setGames(response.data));
          }
        } catch (err) {
          console.error('Error loading games:', err);
        }
      }
    };

    loadGames();
  }, [games.length, dispatch]);

  // Find game information from Redux store by matching scratchId
  useEffect(() => {
    if (gameId && games.length > 0) {
      const foundGame = games.find(game => {
        // Extract scratchId from scratch_api URL
        const scratchIdMatch = game.scratchApi.match(/\/projects\/(\d+)/);
        const scratchId = scratchIdMatch ? scratchIdMatch[1] : game.scratchId;
        return scratchId === gameId;
      });
      setGameInfo(foundGame || null);
      
      // Start timing when game is found and loaded
      if (foundGame && !gameStartTime) {
        setGameStartTime(Date.now());
      }
    }
  }, [gameId, games, gameStartTime]);

  // Track initial game click (without time) when game loads
  useEffect(() => {
    const trackClick = async () => {
      if (!gameInfo || clickTracked) return;

      try {
        // Track initial click without time for immediate feedback
        const response = await trackGameClick(
          gameInfo.gameId,
          user?.id,
          user?.role
        );

        if (response.success && response.data) {
          console.log('Initial click tracked:', response.data);
        }
      } catch (error) {
        console.error('Failed to track initial game click:', error);
        // Continue showing the game even if tracking fails
      } finally {
        setClickTracked(true);
      }
    };

    trackClick();
  }, [gameInfo, user, clickTracked, dispatch]);

  // Submit time-based score ONLY when student leaves the page
  useEffect(() => {
    const submitTimeScore = async () => {
      if (!gameInfo || !gameStartTime || timeSubmitted || user?.role !== 'student') {
        return;
      }

      const timeSpent = Math.floor((Date.now() - gameStartTime) / 1000);
      
      // Only submit if user has played for at least 30 seconds
      if (timeSpent < 30) {
        return;
      }

      try {
        const response = await trackGameClick(
          gameInfo.gameId,
          user?.id,
          user?.role,
          timeSpent
        );

        if (response.success && response.data) {
          console.log('Score calculated on page leave. Time played:', timeSpent, 'seconds. Marks:', response.data.marks);
          
          // Update marks in Redux store if marks were updated
          if (response.data.marks !== undefined) {
            dispatch(updateMarks(response.data.marks));
          }
          
          setTimeSubmitted(true);
        }
      } catch (error) {
        console.error('Failed to submit time-based score:', error);
      }
    };

    // Submit score when user leaves the page (browser close/refresh/navigate away)
    const handleBeforeUnload = () => {
      if (gameInfo && gameStartTime && !timeSubmitted && user?.role === 'student') {
        const timeSpent = Math.floor((Date.now() - gameStartTime) / 1000);
        if (timeSpent >= 30) {
          // Use sendBeacon for reliable submission on page unload
          const success = navigator.sendBeacon(
            `${API_BASE_URL}/games/${gameInfo.gameId}/click`,
            JSON.stringify({
              student_id: user?.id,
              role: user?.role,
              time_spent: timeSpent,
            })
          );
          console.log('Score submitted via sendBeacon on page unload:', success, 'Time:', timeSpent, 'seconds');
        }
      }
    };

    // Submit score when user switches tabs/minimizes window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        submitTimeScore();
      }
    };

    // Add event listeners for page leave detection
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function - submit score when component unmounts (navigation within app)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Submit final score on component unmount (navigating to different page in app)
      submitTimeScore();
    };
  }, [gameInfo, gameStartTime, timeSubmitted, user, dispatch]);

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
        {/* Responsive iframe container for Scratch game */}
        <Box
          sx={{
            mt: 2,
            width: '100%',
            maxWidth: '900px',
            margin: '0 auto',
            position: 'relative',
            paddingBottom: '70%', // Reduced size for better fit
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

        {/* Game Information Box */}
        {gameInfo && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              maxWidth: '900px',
              margin: '24px auto 0',
              bgcolor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: 2,
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              {gameInfo.gameName}
            </Typography>
            
            {gameInfo.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                {gameInfo.description}
              </Typography>
            )}
            
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Subject
                </Typography>
                <Chip 
                  label={t(`homepage.subjects.${gameInfo.subject}`)} 
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Difficulty
                </Typography>
                <Chip 
                  label={t(`homepage.difficulties.${gameInfo.difficulty}`)} 
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </Stack>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default GamePage;
