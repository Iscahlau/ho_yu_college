/**
 * Download Service
 * Handles data export/download operations
 */

import api, { ApiResponse } from './api';

const STUDENTS_ENDPOINT = import.meta.env.VITE_STUDENTS_ENDPOINT || '/students';
const TEACHERS_ENDPOINT = import.meta.env.VITE_TEACHERS_ENDPOINT || '/teachers';
const GAMES_ENDPOINT = import.meta.env.VITE_GAMES_ENDPOINT || '/games';

/**
 * Download student data as Excel/CSV
 * Teachers can only download their own class data
 * @param classFilter - Optional class filter for teachers (e.g., ['1A', '2A'])
 */
export async function downloadStudentData(classFilter?: string[]): Promise<ApiResponse<Blob>> {
  const params = classFilter && classFilter.length > 0 
    ? `?classes=${classFilter.join(',')}` 
    : '';
  
  return api.apiFetch<Blob>(`${STUDENTS_ENDPOINT}/download${params}`, {
    method: 'GET',
  });
}

/**
 * Download teacher data as Excel/CSV (Admin only)
 */
export async function downloadTeacherData(): Promise<ApiResponse<Blob>> {
  return api.apiFetch<Blob>(`${TEACHERS_ENDPOINT}/download`, {
    method: 'GET',
  });
}

/**
 * Download games data as Excel/CSV
 */
export async function downloadGamesData(): Promise<ApiResponse<Blob>> {
  return api.apiFetch<Blob>(`${GAMES_ENDPOINT}/download`, {
    method: 'GET',
  });
}

export default {
  downloadStudentData,
  downloadTeacherData,
  downloadGamesData,
};
