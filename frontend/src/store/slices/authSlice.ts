import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name1?: string; // For students (name_1)
  name2?: string; // For students (name_2)
  name?: string;  // For teachers (single name field)
  marks: number;
  role: 'student' | 'teacher' | 'admin';
  class?: string;
  responsibleClasses?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loginTime: number | null;
}

// Load auth state from sessionStorage on initialization
const loadAuthState = (): AuthState => {
  try {
    const serializedState = sessionStorage.getItem('authState');
    if (serializedState) {
      return JSON.parse(serializedState);
    }
  } catch (err) {
    console.error('Failed to load auth state from sessionStorage:', err);
  }
  return {
    user: null,
    isAuthenticated: false,
    loginTime: null,
  };
};

const initialState: AuthState = loadAuthState();

// Helper function to save auth state to sessionStorage
const saveAuthState = (state: AuthState) => {
  try {
    const serializedState = JSON.stringify(state);
    sessionStorage.setItem('authState', serializedState);
  } catch (err) {
    console.error('Failed to save auth state to sessionStorage:', err);
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loginTime = Date.now();
      saveAuthState(state);
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loginTime = null;
      // Clear sessionStorage on logout
      sessionStorage.removeItem('authState');
    },
    updateMarks: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.marks = action.payload;
        saveAuthState(state);
      }
    },
  },
});

export const { login, logout, updateMarks } = authSlice.actions;
export default authSlice.reducer;
