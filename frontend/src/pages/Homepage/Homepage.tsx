import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  Container,
  Grid,
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store/store';
import { setGames, setLoading, setError } from '../../store/slices/gamesSlice';
import { fetchGames } from '../../services/gamesService';
import type { Game } from '../../store/slices/gamesSlice';

/**
 * Homepage - Displays game library with filters
 * Accessible only after login
 */
function Homepage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { filteredGames, loading, error } = useSelector((state: RootState) => state.games);

  useEffect(() => {
    const loadGames = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      try {
        const response = await fetchGames();
        if (response.success && response.data) {
          dispatch(setGames(response.data));
        } else {
          dispatch(setError(response.error || 'Failed to load games'));
        }
      } catch (err) {
        dispatch(setError('An unexpected error occurred'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    loadGames();
  }, [dispatch]);

  const handleGameClick = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          學趣天地 - Game Library
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse and play Scratch games. Use filters to find games by subject and difficulty.
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && filteredGames.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No games found. Please check back later.
          </Alert>
        )}

        {!loading && !error && filteredGames.length > 0 && (
          <Grid container spacing={3}>
            {filteredGames.map((game: Game) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={game.gameId}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CardActionArea onClick={() => handleGameClick(game.gameId)}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={game.thumbnailUrl || 'https://via.placeholder.com/400x300?text=Game+Thumbnail'}
                      alt={game.gameName}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                      <Typography variant="h6" gutterBottom noWrap>
                        {game.gameName}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip 
                          label={game.subject} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          label={game.difficulty} 
                          size="small" 
                          color="secondary"
                          variant="outlined"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Plays: {game.accumulatedClick}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}

export default Homepage;
