/**
 * Upload Service
 * Handles file uploads for students, teachers, and games data
 */

import { FileUploadResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Upload student data file
 * @param file - Excel or CSV file containing student data
 * @returns Promise with upload response
 */
export async function uploadStudentData(file: File): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'students');

    const response = await fetch(`${API_BASE_URL}/upload/students`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to upload student data',
        errors: data.errors,
      };
    }

    return {
      success: true,
      message: data.message || 'Student data uploaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Upload teacher data file (admin only)
 * @param file - Excel or CSV file containing teacher data
 * @returns Promise with upload response
 */
export async function uploadTeacherData(file: File): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'teachers');

    const response = await fetch(`${API_BASE_URL}/upload/teachers`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to upload teacher data',
        errors: data.errors,
      };
    }

    return {
      success: true,
      message: data.message || 'Teacher data uploaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Upload game data file
 * @param file - Excel or CSV file containing game data
 * @returns Promise with upload response
 */
export async function uploadGameData(file: File): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'games');

    const response = await fetch(`${API_BASE_URL}/upload/games`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to upload game data',
        errors: data.errors,
      };
    }

    return {
      success: true,
      message: data.message || 'Game data uploaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
