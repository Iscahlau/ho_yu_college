import { Box, FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { setSubjectFilter, setDifficultyFilter } from '../../store/slices/gamesSlice';
import type { Subject, Difficulty } from '../../store/slices/gamesSlice';

/**
 * FilterBar component - Option bar for subject and difficulty filters
 */
function FilterBar() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { filters } = useSelector((state: RootState) => state.games);

  const handleSubjectChange = (event: SelectChangeEvent) => {
    dispatch(setSubjectFilter(event.target.value as Subject));
  };

  const handleDifficultyChange = (event: SelectChangeEvent) => {
    dispatch(setDifficultyFilter(event.target.value as Difficulty));
  };

  return (
    <Box
      sx={{
        bgcolor: '#FFD54F',
        py: 2,
        px: 3,
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <FormControl sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
        <Select
          value={filters.subject}
          onChange={handleSubjectChange}
          displayEmpty
          sx={{ height: 40 }}
        >
          <MenuItem value="all">☐ {t('homepage.filters.subject')} - {t('homepage.filters.all')}</MenuItem>
          <MenuItem value="Chinese Language">☐ {t('homepage.subjects.chineseLanguage')}</MenuItem>
          <MenuItem value="English Language">☐ {t('homepage.subjects.englishLanguage')}</MenuItem>
          <MenuItem value="Mathematics">☐ {t('homepage.subjects.mathematics')}</MenuItem>
          <MenuItem value="Humanities and Science">☐ {t('homepage.subjects.humanitiesAndScience')}</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
        <Select
          value={filters.difficulty}
          onChange={handleDifficultyChange}
          displayEmpty
          sx={{ height: 40 }}
        >
          <MenuItem value="all">☐ {t('homepage.filters.difficulty')} - {t('homepage.filters.all')}</MenuItem>
          <MenuItem value="Beginner">☐ {t('homepage.difficulties.beginner')}</MenuItem>
          <MenuItem value="Intermediate">☐ {t('homepage.difficulties.intermediate')}</MenuItem>
          <MenuItem value="Advanced">☐ {t('homepage.difficulties.advanced')}</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

export default FilterBar;
