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
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch } from '../../store/store';
import { setGames, setLoading, setError } from '../../store/slices/gamesSlice';
import { fetchGames } from '../../services/gamesService';
import type { Game } from '../../store/slices/gamesSlice';
import FilterBar from '../../components/FilterBar';

/**
 * Homepage - Displays game library with filters
 * Accessible only after login
 */
function Homepage() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { filteredGames, loading } = useSelector((state: RootState) => state.games);

  useEffect(() => {
    const loadGames = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      try {
        const response = await fetchGames();
        if (response.success && response.data) {
          dispatch(setGames(response.data));
        } else {
          // Use mock data for demonstration when API is unavailable
          const mockGames: Game[] = [
            {
              gameId: '1',
              gameName: 'Inspiration',
              studentId: 'S001',
              subject: 'Chinese Language',
              difficulty: 'Beginner',
              teacherId: 'T001',
              lastUpdate: new Date().toISOString(),
              scratchId: '123456',
              scratchApi: 'https://api.scratch.mit.edu/projects/123456',
              accumulatedClick: 45,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Inspiration',
            },
            {
              gameId: '2',
              gameName: 'Consistency',
              studentId: 'S002',
              subject: 'English Language',
              difficulty: 'Intermediate',
              teacherId: 'T001',
              lastUpdate: new Date().toISOString(),
              scratchId: '123457',
              scratchApi: 'https://api.scratch.mit.edu/projects/123457',
              accumulatedClick: 78,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Run+Cycle',
            },
            {
              gameId: '3',
              gameName: 'Design',
              studentId: 'S003',
              subject: 'Mathematics',
              difficulty: 'Advanced',
              teacherId: 'T001',
              lastUpdate: new Date().toISOString(),
              scratchId: '123458',
              scratchApi: 'https://api.scratch.mit.edu/projects/123458',
              accumulatedClick: 92,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Design',
            },
            {
              gameId: '4',
              gameName: 'Sharing',
              studentId: 'S004',
              subject: 'Humanities and Science',
              difficulty: 'Beginner',
              teacherId: 'T001',
              lastUpdate: new Date().toISOString(),
              scratchId: '123459',
              scratchApi: 'https://api.scratch.mit.edu/projects/123459',
              accumulatedClick: 34,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Sharing',
            },
            {
              gameId: '5',
              gameName: 'Adventure Quest',
              studentId: 'S005',
              subject: 'Chinese Language',
              difficulty: 'Intermediate',
              teacherId: 'T002',
              lastUpdate: new Date().toISOString(),
              scratchId: '123460',
              scratchApi: 'https://api.scratch.mit.edu/projects/123460',
              accumulatedClick: 156,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Adventure',
            },
            {
              gameId: '6',
              gameName: 'Math Challenge',
              studentId: 'S006',
              subject: 'Mathematics',
              difficulty: 'Advanced',
              teacherId: 'T002',
              lastUpdate: new Date().toISOString(),
              scratchId: '123461',
              scratchApi: 'https://api.scratch.mit.edu/projects/123461',
              accumulatedClick: 203,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Math',
            },
            {
              gameId: '7',
              gameName: 'Space Explorer',
              studentId: 'S007',
              subject: 'Humanities and Science',
              difficulty: 'Intermediate',
              teacherId: 'T002',
              lastUpdate: new Date().toISOString(),
              scratchId: '123462',
              scratchApi: 'https://api.scratch.mit.edu/projects/123462',
              accumulatedClick: 187,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Space',
            },
            {
              gameId: '8',
              gameName: 'Word Master',
              studentId: 'S008',
              subject: 'English Language',
              difficulty: 'Beginner',
              teacherId: 'T003',
              lastUpdate: new Date().toISOString(),
              scratchId: '123463',
              scratchApi: 'https://api.scratch.mit.edu/projects/123463',
              accumulatedClick: 98,
              thumbnailUrl: 'https://via.placeholder.com/135x102?text=Words',
            },
          ];
          dispatch(setGames(mockGames));
        }
      } catch (err) {
        // Use mock data even on error for demonstration
        const mockGames: Game[] = [
          {
            gameId: '1',
            gameName: 'Inspiration',
            studentId: 'S001',
            subject: 'Chinese Language',
            difficulty: 'Beginner',
            teacherId: 'T001',
            lastUpdate: new Date().toISOString(),
            scratchId: '123456',
            scratchApi: 'https://api.scratch.mit.edu/projects/123456',
            accumulatedClick: 45,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Inspiration',
          },
          {
            gameId: '2',
            gameName: 'Consistency',
            studentId: 'S002',
            subject: 'English Language',
            difficulty: 'Intermediate',
            teacherId: 'T001',
            lastUpdate: new Date().toISOString(),
            scratchId: '123457',
            scratchApi: 'https://api.scratch.mit.edu/projects/123457',
            accumulatedClick: 78,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Run+Cycle',
          },
          {
            gameId: '3',
            gameName: 'Design',
            studentId: 'S003',
            subject: 'Mathematics',
            difficulty: 'Advanced',
            teacherId: 'T001',
            lastUpdate: new Date().toISOString(),
            scratchId: '123458',
            scratchApi: 'https://api.scratch.mit.edu/projects/123458',
            accumulatedClick: 92,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Design',
          },
          {
            gameId: '4',
            gameName: 'Sharing',
            studentId: 'S004',
            subject: 'Humanities and Science',
            difficulty: 'Beginner',
            teacherId: 'T001',
            lastUpdate: new Date().toISOString(),
            scratchId: '123459',
            scratchApi: 'https://api.scratch.mit.edu/projects/123459',
            accumulatedClick: 34,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Sharing',
          },
          {
            gameId: '5',
            gameName: 'Adventure Quest',
            studentId: 'S005',
            subject: 'Chinese Language',
            difficulty: 'Intermediate',
            teacherId: 'T002',
            lastUpdate: new Date().toISOString(),
            scratchId: '123460',
            scratchApi: 'https://api.scratch.mit.edu/projects/123460',
            accumulatedClick: 156,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Adventure',
          },
          {
            gameId: '6',
            gameName: 'Math Challenge',
            studentId: 'S006',
            subject: 'Mathematics',
            difficulty: 'Advanced',
            teacherId: 'T002',
            lastUpdate: new Date().toISOString(),
            scratchId: '123461',
            scratchApi: 'https://api.scratch.mit.edu/projects/123461',
            accumulatedClick: 203,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Math',
          },
          {
            gameId: '7',
            gameName: 'Space Explorer',
            studentId: 'S007',
            subject: 'Humanities and Science',
            difficulty: 'Intermediate',
            teacherId: 'T002',
            lastUpdate: new Date().toISOString(),
            scratchId: '123462',
            scratchApi: 'https://api.scratch.mit.edu/projects/123462',
            accumulatedClick: 187,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Space',
          },
          {
            gameId: '8',
            gameName: 'Word Master',
            studentId: 'S008',
            subject: 'English Language',
            difficulty: 'Beginner',
            teacherId: 'T003',
            lastUpdate: new Date().toISOString(),
            scratchId: '123463',
            scratchApi: 'https://api.scratch.mit.edu/projects/123463',
            accumulatedClick: 98,
            thumbnailUrl: 'https://via.placeholder.com/135x102?text=Words',
          },
        ];
        dispatch(setGames(mockGames));
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
    <Box sx={{ minHeight: '100vh' }}>
      {/* Filter Bar */}
      <FilterBar />

      {/* Main Content with Rainbow Background */}
      <Box
        sx={{
          background: 'linear-gradient(to right, #87CEEB 0%, #87CEEB 20%, #98D8C8 35%, #FFEB3B 50%, #FFB74D 65%, #F48FB1 80%, #CE93D8 100%)',
          minHeight: 'calc(100vh - 64px - 56px - 120px)', // viewport - navbar - filterbar - footer
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          {/* All Projects Header */}
          <Box
            sx={{
              bgcolor: 'rgba(229, 115, 115, 0.9)',
              borderRadius: 2,
              p: 2.5,
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', mb: 0.5 }}>
              {t('homepage.allProjects')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
              All projects
            </Typography>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          )}

          {!loading && filteredGames.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No games found. Please check back later.
            </Alert>
          )}

          {!loading && filteredGames.length > 0 && (
            <Grid container spacing={3}>
              {filteredGames.map((game: Game) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={game.gameId}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: 'rgba(255, 255, 255, 0.95)',
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="102"
                      image={game.thumbnailUrl || 'https://via.placeholder.com/135x102?text=Game'}
                      alt={game.gameName}
                      sx={{ objectFit: 'cover', width: '100%' }}
                    />
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom noWrap fontWeight="bold">
                        {game.gameName}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                        Learn more about {game.gameName.toLowerCase()}.
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                        <Chip 
                          label={game.subject} 
                          size="small" 
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                        <Chip 
                          label={game.difficulty} 
                          size="small" 
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleGameClick(game.gameId)}
                        sx={{
                          bgcolor: '#9C27B0',
                          '&:hover': {
                            bgcolor: '#7B1FA2',
                          },
                          borderRadius: 20,
                          textTransform: 'none',
                          fontWeight: 'bold',
                        }}
                      >
                        {t('homepage.playButton')}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default Homepage;
