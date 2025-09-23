import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Box,
  TextField,
} from '@mui/material';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../layouts/MainLayout';
import type { Game, GameTag, GameLevel, FilterOptions } from '../types';

// Mock data - TODO: Replace with API calls
const mockGames: Game[] = [
  {
    id: '1',
    title: 'Math Adventure',
    description: 'Learn basic math through fun puzzles',
    scratchUrl: 'https://scratch.mit.edu/projects/123456/',
    tags: ['mathematics'],
    level: 'beginner',
  },
  {
    id: '2',
    title: 'English Word Quest',
    description: 'Improve vocabulary with this engaging game',
    scratchUrl: 'https://scratch.mit.edu/projects/234567/',
    tags: ['english'],
    level: 'intermediate',
  },
  {
    id: '3',
    title: 'Chinese Character Challenge',
    description: 'Practice Chinese characters in a fun way',
    scratchUrl: 'https://scratch.mit.edu/projects/345678/',
    tags: ['chinese'],
    level: 'beginner',
  },
];

export function GamesPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterOptions>({
    tags: [],
    levels: [],
    searchTerm: '',
  });

  const filteredGames = useMemo(() => {
    return mockGames.filter(game => {
      const matchesSearch = !filters.searchTerm || 
        game.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        game.description.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      const matchesTags = filters.tags.length === 0 || 
        filters.tags.some(tag => game.tags.includes(tag));
      
      const matchesLevels = filters.levels.length === 0 || 
        filters.levels.includes(game.level);

      return matchesSearch && matchesTags && matchesLevels;
    });
  }, [filters]);

  const handleTagChange = (event: any) => {
    setFilters(prev => ({
      ...prev,
      tags: event.target.value as GameTag[],
    }));
  };

  const handleLevelChange = (event: any) => {
    setFilters(prev => ({
      ...prev,
      levels: event.target.value as GameLevel[],
    }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      searchTerm: event.target.value,
    }));
  };

  const handlePlayGame = (game: Game) => {
    // TODO: Implement game launch with Scratch API integration
    // For now, open in new tab
    window.open(game.scratchUrl, '_blank');
  };

  const availableTags: GameTag[] = ['chinese', 'english', 'mathematics'];
  const availableLevels: GameLevel[] = ['beginner', 'intermediate', 'advanced'];

  return (
    <MainLayout showNavigation studentName="John Doe">
      <Container maxWidth="lg">
        <Typography variant="h2" gutterBottom>
          {t('games.title')}
        </Typography>

        {/* Filters */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label={t('common.search')}
                value={filters.searchTerm}
                onChange={handleSearchChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('games.filterByTag')}</InputLabel>
                <Select
                  multiple
                  value={filters.tags}
                  onChange={handleTagChange}
                  input={<OutlinedInput label={t('games.filterByTag')} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={t(`games.tags.${value}`)} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      {t(`games.tags.${tag}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('games.filterByLevel')}</InputLabel>
                <Select
                  multiple
                  value={filters.levels}
                  onChange={handleLevelChange}
                  input={<OutlinedInput label={t('games.filterByLevel')} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={t(`games.levels.${value}`)} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {t(`games.levels.${level}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Games Grid */}
        <Grid container spacing={3}>
          {filteredGames.map((game) => (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {game.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {game.description}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    {game.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={t(`games.tags.${tag}`)}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  <Chip
                    label={t(`games.levels.${game.level}`)}
                    size="small"
                    color="secondary"
                  />
                </CardContent>
                <CardActions>
                  <Button
                    size="large"
                    startIcon={<PlayIcon />}
                    variant="contained"
                    fullWidth
                    onClick={() => handlePlayGame(game)}
                  >
                    {t('games.playGame')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredGames.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No games found matching your criteria.
            </Typography>
          </Box>
        )}
      </Container>
    </MainLayout>
  );
}