import { Box, Chip, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setSubjectFilter, setDifficultyFilter, Subject, Difficulty } from '../../store/slices/gamesSlice';
import { SUBJECTS, DIFFICULTIES } from '../../utils/constants';

/**
 * FilterBar component - Displays filter options for subject and difficulty
 */
function FilterBar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { subject, difficulty } = useAppSelector((state) => state.games.filters);

  const handleSubjectClick = (selectedSubject: Subject) => {
    dispatch(setSubjectFilter(selectedSubject));
  };

  const handleDifficultyClick = (selectedDifficulty: Difficulty) => {
    dispatch(setDifficultyFilter(selectedDifficulty));
  };

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <Stack spacing={2}>
        {/* Subject Filters */}
        <Box sx={{ p: 1, bgcolor: '#FFEC8D', borderRadius: 1 }}>
          {/*<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>*/}
          {/*  {t('homepage.filters.subject')}*/}
          {/*</Typography>*/}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={t('homepage.filters.all')}
              onClick={() => handleSubjectClick('all')}
              variant={subject === 'all' ? 'filled' : 'outlined'}
              sx={{ 
                cursor: 'pointer',
                backgroundColor: subject === 'all' ? '#000000' : 'transparent',
                color: '#FFEC8D',
                borderColor: '#000000',
                '&:hover': {
                  backgroundColor: subject === 'all' ? '#333333' : 'rgba(0,0,0,0.1)'
                }
              }}
            />
            {SUBJECTS.map((subjectOption) => (
              <Chip
                key={subjectOption}
                label={t(`homepage.subjects.${subjectOption}`)}
                onClick={() => handleSubjectClick(subjectOption)}
                variant={subject === subjectOption ? 'filled' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  backgroundColor: subject === subjectOption ? '#000000' : 'transparent',
                  color: '#FFEC8D',
                  borderColor: '#000000',
                  '&:hover': {
                    backgroundColor: subject === subjectOption ? '#333333' : 'rgba(0,0,0,0.1)'
                  }
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Difficulty Filters */}
        <Box sx={{ p: 1, bgcolor: '#A080FF', borderRadius: 1 }}>
          {/*<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>*/}
          {/*  {t('homepage.filters.difficulty')}*/}
          {/*</Typography>*/}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={t('homepage.filters.all')}
              onClick={() => handleDifficultyClick('all')}
              variant={difficulty === 'all' ? 'filled' : 'outlined'}
              sx={{ 
                cursor: 'pointer',
                backgroundColor: difficulty === 'all' ? '#FFFFFF' : 'transparent',
                color: '#A080FF',
                borderColor: '#FFFFFF',
                '&:hover': {
                  backgroundColor: difficulty === 'all' ? '#F0F0F0' : 'rgba(255,255,255,0.1)'
                }
              }}
            />
            {DIFFICULTIES.map((difficultyOption) => (
              <Chip
                key={difficultyOption}
                label={t(`homepage.difficulties.${difficultyOption}`)}
                onClick={() => handleDifficultyClick(difficultyOption)}
                variant={difficulty === difficultyOption ? 'filled' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  backgroundColor: difficulty === difficultyOption ? '#FFFFFF' : 'transparent',
                  color: '#A080FF',
                  borderColor: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: difficulty === difficultyOption ? '#F0F0F0' : 'rgba(255,255,255,0.1)'
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export default FilterBar;
