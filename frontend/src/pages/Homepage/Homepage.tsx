import {useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {
    Box,
    Typography,
    Container,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Stack
} from '@mui/material';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {RootState, AppDispatch} from '../../store/store';
import {setGames, setLoading, setError} from '../../store/slices/gamesSlice';
import {fetchGames} from '../../services/gamesService';
import type {Game} from '../../store/slices/gamesSlice';
import FilterBar from '../../components/FilterBar';

/**
 * Homepage - Displays game library with filters
 * Accessible only after login
 */
function Homepage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {filteredGames, loading, error} = useSelector((state: RootState) => state.games);
    const {isAuthenticated} = useSelector((state: RootState) => state.auth);

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

    const handleGameClick = (game: Game) => {
        // Extract Scratch project ID from scratch_api URL
        // Format: https://scratch.mit.edu/projects/{scratchId}
        const scratchIdMatch = game.scratchApi.match(/\/projects\/(\d+)/);
        const scratchId = scratchIdMatch ? scratchIdMatch[1] : game.scratchId;
        navigate(`/game/${scratchId}`);
    };

    return (
        <Container>
            <Box sx={{mt: 4, mb: 4}}>
                <FilterBar/>

                <Typography variant="h4" gutterBottom>
                    學趣天地 - Game Library
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{mb: 3}}>
                    Browse and play Scratch games. Use filters to find games by subject and difficulty.
                </Typography>

                {loading && (
                    <Box sx={{display: 'flex', justifyContent: 'center', mt: 4}}>
                        <CircularProgress/>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{mt: 2}}>
                        {error}
                    </Alert>
                )}

                {!loading && !error && filteredGames.length === 0 && (
                    <Alert severity="info" sx={{mt: 2}}>
                        No games found. Please check back later.
                    </Alert>
                )}

        {!loading && !error && filteredGames.length > 0 && (
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '20px',
              mt: 3,
              overflow: 'hidden',
            }}
          >
            {/* Title Section */}
            <Box
              sx={{
                backgroundColor: '#E95354',
                height: '116px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                {t('homepage.gameListTitle')}
              </Typography>
            </Box>

            {/* Game Cards Grid */}
            <Box sx={{ p: 2 }}>
              <Grid container spacing={3}>
                {filteredGames.map((game: Game) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={game.gameId}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="140"
                        image={game.thumbnailUrl || 'https://via.placeholder.com/400x300?text=Game+Thumbnail'}
                        alt={game.gameName}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom noWrap>
                          {game.gameName}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip 
                            label={t(`homepage.subjects.${game.subject}`)} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                          <Chip 
                            label={t(`homepage.difficulties.${game.difficulty}`)} 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                          />
                        </Stack>
                      </CardContent>
                      {isAuthenticated && (
                        <CardActions sx={{ p: 2, pt: 0 }}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            onClick={() => handleGameClick(game)}
                            sx={{
                              backgroundColor: '#BE86CD',
                              '&:hover': {
                                backgroundColor: '#A76BB8',
                              }
                            }}
                          >
                            {t('homepage.playButton')}
                          </Button>
                        </CardActions>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default Homepage;
