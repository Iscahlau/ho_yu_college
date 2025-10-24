import {useEffect, useState} from 'react';
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
import {fetchGames, enrichGameWithScratchData} from '../../services/gamesService';
import type {Game} from '../../store/slices/gamesSlice';
import FilterBar from '../../components/FilterBar';
import {getDefaultScratchThumbnail} from '../../utils/helpers';

/**
 * Homepage - Displays game library with filters
 * Accessible only after login
 *
 * Features:
 * - Automatically fetches game metadata from Scratch API
 * - Enriches game cards with real titles and thumbnails from Scratch
 * - Falls back to default values if Scratch API is unavailable
 */
function Homepage() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {games, filteredGames, filters, loading, error} = useSelector((state: RootState) => state.games);
    const {isAuthenticated} = useSelector((state: RootState) => state.auth);
    const [enrichedGames, setEnrichedGames] = useState<Game[]>([]);
    const [enriching, setEnriching] = useState(false);

    // Load games from backend
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

    // Enrich games with Scratch API data when games are loaded
    useEffect(() => {
        if (games.length > 0) {
            const enrichGames = async () => {
                setEnriching(true);
                try {
                    const enrichedData = await Promise.all(
                        games.map(game => enrichGameWithScratchData(game))
                    );
                    setEnrichedGames(enrichedData);
                } catch (err) {
                    console.error('Error enriching games with Scratch data:', err);
                    // Fall back to original games if enrichment fails
                    setEnrichedGames(games);
                } finally {
                    setEnriching(false);
                }
            };

            enrichGames();
        }
    }, [games]);

    // Apply filters to enriched games
    const displayGames = enrichedGames.length > 0 ? enrichedGames.filter((game) => {
        const subjectMatch = filters.subject === 'all' || game.subject === filters.subject;
        const difficultyMatch = filters.difficulty === 'all' || game.difficulty === filters.difficulty;
        return subjectMatch && difficultyMatch;
    }) : filteredGames;

    const handleGameClick = (game: Game) => {
        // Use gameId (which is now the Scratch project ID) or fall back to scratchId
        const scratchId = game.gameId || game.scratchId;
        navigate(`/game/${scratchId}`);
    };

    return (
        <>
            <FilterBar/>

            <Container>
                <Box sx={{mt: 4, mb: 4}}>

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

                    {!loading && !error && displayGames.length > 0 && (
                        <Box
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '20px',
                                mt: 3,
                                mb: 3,
                                ml: 3,
                                mr: 3,
                                overflow: 'hidden'
                            }}
                        >
                            {/* Title Section */}
                            <Box
                                sx={{
                                    bgcolor: '#E95354',
                                    height: '90px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Typography
                                    variant="h4"
                                    sx={{
                                        color: '#FFFFFF',
                                        fontWeight: 600
                                    }}
                                >
                                    {t('homepage.gameListTitle')}
                                </Typography>
                            </Box>

                            {/* Game Cards Grid */}
                            <Box sx={{p: 4}}>
                                <Grid container spacing={3}>
                                    {displayGames.map((game: Game) => {
                                        // Use gameId (which is the Scratch project ID) or fall back to scratchId
                                        const scratchId = game.gameId || game.scratchId;
                                        const fallbackThumbnail = getDefaultScratchThumbnail(scratchId);

                                        return (
                                            <Grid size={{xs: 12, sm: 6, md: 3}} key={game.gameId}>
                                                <Card
                                                    sx={{
                                                        height: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <CardMedia
                                                        component="img"
                                                        height="140"
                                                        image={game.thumbnailUrl || fallbackThumbnail}
                                                        alt={game.gameName}
                                                        sx={{objectFit: 'cover'}}
                                                    />
                                                    {enriching && (
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                                                borderRadius: 1,
                                                                p: 0.5,
                                                            }}
                                                        >
                                                            <CircularProgress size={16}/>
                                                        </Box>
                                                    )}
                                                    <CardContent sx={{flexGrow: 1}}>
                                                        <Typography variant="h6" gutterBottom
                                                                    title={game.gameName}
                                                                    sx={{
                                                                        overflow: 'hidden',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 2,
                                                                        WebkitBoxOrient: 'vertical',
                                                                        wordBreak: 'break-word'
                                                                    }}>
                                                            {game.gameName}
                                                        </Typography>
                                                        <Stack direction="column" spacing={1} sx={{mb: 1}}>
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
                                                        <CardActions sx={{p: 2, pt: 0}}>
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
                                        );
                                    })}
                                </Grid>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Container>
        </>
    );
}

export default Homepage;
