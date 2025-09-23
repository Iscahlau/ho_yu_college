export interface Student {
  id: string;
  name: string;
  studentId: string;
  score: number;
  gameHistory: GameRecord[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  scratchUrl: string;
  tags: GameTag[];
  level: GameLevel;
  thumbnailUrl?: string;
}

export interface GameRecord {
  gameId: string;
  playedAt: Date;
  score: number;
  duration: number; // in minutes
}

export type GameTag = 'chinese' | 'english' | 'mathematics';
export type GameLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LoginCredentials {
  studentId: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  student: Student | null;
  isAdmin: boolean;
}

export interface FilterOptions {
  tags: GameTag[];
  levels: GameLevel[];
  searchTerm: string;
}