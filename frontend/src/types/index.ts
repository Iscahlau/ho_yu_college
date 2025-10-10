// Database Types

export interface Student {
  student_id: string;
  name_1: string;
  name_2: string;
  marks: number;
  class: string;
  class_no: string;
  last_login: string;
  last_update: string;
  teacher_id: string;
  password: string;
}

export interface Teacher {
  teacher_id: string;
  name: string;
  password: string;
  responsible_class: string[];
  last_login: string;
  is_admin: boolean;
}

export interface GameData {
  game_id: string;
  game_name: string;
  student_id: string;
  subject: 'Chinese Language' | 'English Language' | 'Mathematics' | 'Humanities and Science';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  teacher_id: string;
  last_update: string;
  scratch_id: string;
  scratch_api: string;
  accumulated_click: number;
}

// API Types

export interface LoginRequest {
  id: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: Student | Teacher;
  role: 'student' | 'teacher' | 'admin';
}

export interface FileUploadRequest {
  file: File;
  type: 'students' | 'teachers' | 'games';
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

// Scratch API Types

export interface ScratchProject {
  id: number;
  title: string;
  description: string;
  instructions: string;
  author: {
    username: string;
  };
  image: string;
}
