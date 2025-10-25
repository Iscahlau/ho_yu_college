import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Subject = 'Chinese Language' | 'English Language' | 'Mathematics' | 'Humanities and Science' | 'all';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'all';

export interface Game {
  gameId: string;
  gameName: string;
  studentId: string;
  subject: Subject;
  difficulty: Difficulty;
  teacherId: string;
  lastUpdate: string;
  scratchId: string;
  scratchApi: string;
  accumulatedClick: number;
  description?: string;
  thumbnailUrl?: string;
}

interface GamesState {
  games: Game[];
  filteredGames: Game[];
  filters: {
    subject: Subject;
    difficulty: Difficulty;
  };
  loading: boolean;
  error: string | null;
}

const initialState: GamesState = {
  games: [],
  filteredGames: [],
  filters: {
    subject: 'all',
    difficulty: 'all',
  },
  loading: false,
  error: null,
};

const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    setGames: (state, action: PayloadAction<Game[]>) => {
      state.games = action.payload;
      state.filteredGames = action.payload;
    },
    setSubjectFilter: (state, action: PayloadAction<Subject>) => {
      state.filters.subject = action.payload;
      applyFilters(state);
    },
    setDifficultyFilter: (state, action: PayloadAction<Difficulty>) => {
      state.filters.difficulty = action.payload;
      applyFilters(state);
    },
    incrementGameClick: (state, action: PayloadAction<string>) => {
      const game = state.games.find((g) => g.gameId === action.payload);
      if (game) {
        game.accumulatedClick++;
      }
      applyFilters(state);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

function applyFilters(state: GamesState) {
  state.filteredGames = state.games.filter((game) => {
    const subjectMatch = state.filters.subject === 'all' || game.subject === state.filters.subject;
    const difficultyMatch = state.filters.difficulty === 'all' || game.difficulty === state.filters.difficulty;
    return subjectMatch && difficultyMatch;
  });
}

export const {
  setGames,
  setSubjectFilter,
  setDifficultyFilter,
  incrementGameClick,
  setLoading,
  setError,
} = gamesSlice.actions;

export default gamesSlice.reducer;
