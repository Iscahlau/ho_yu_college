import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name1: string;
  name2: string;
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

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loginTime: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loginTime = Date.now();
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loginTime = null;
    },
    updateMarks: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.marks = action.payload;
      }
    },
  },
});

export const { login, logout, updateMarks } = authSlice.actions;
export default authSlice.reducer;
