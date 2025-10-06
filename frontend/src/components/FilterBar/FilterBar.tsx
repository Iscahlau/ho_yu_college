import { Box, Chip, Stack, Typography } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setSubjectFilter, setDifficultyFilter, Subject, Difficulty } from '../../store/slices/gamesSlice';
import { SUBJECTS, DIFFICULTIES } from '../../utils/constants';

/**
 * FilterBar component - Displays filter options for subject and difficulty
 */
function FilterBar() {
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
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Subject
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="All"
              onClick={() => handleSubjectClick('all')}
              color="primary"
              variant={subject === 'all' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            {SUBJECTS.map((subjectOption) => (
              <Chip
                key={subjectOption}
                label={subjectOption}
                onClick={() => handleSubjectClick(subjectOption)}
                color="primary"
                variant={subject === subjectOption ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>

        {/* Difficulty Filters */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Difficulty
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="All"
              onClick={() => handleDifficultyClick('all')}
              color="secondary"
              variant={difficulty === 'all' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            {DIFFICULTIES.map((difficultyOption) => (
              <Chip
                key={difficultyOption}
                label={difficultyOption}
                onClick={() => handleDifficultyClick(difficultyOption)}
                color="secondary"
                variant={difficulty === difficultyOption ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export default FilterBar;
