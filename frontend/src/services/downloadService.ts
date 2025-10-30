/**
 * Download Service
 * Handles data export/download operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STUDENTS_ENDPOINT = import.meta.env.VITE_STUDENTS_ENDPOINT || '/students';
const TEACHERS_ENDPOINT = import.meta.env.VITE_TEACHERS_ENDPOINT || '/teachers';
const GAMES_ENDPOINT = import.meta.env.VITE_GAMES_ENDPOINT || '/games';

export interface DownloadResponse {
  success: boolean;
  message: string;
}

/**
 * Helper function to download blob as file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Download student data as Excel
 * Teachers can only download their own class data
 * @param classFilter - Optional class filter for teachers (e.g., ['1A', '2A'])
 */
export async function downloadStudentData(classFilter?: string[]): Promise<DownloadResponse> {
  try {
    const params = classFilter && classFilter.length > 0 
      ? `?classes=${classFilter.join(',')}` 
      : '';
    
    const response = await fetch(`${API_BASE_URL}${STUDENTS_ENDPOINT}/download${params}`, {
      method: 'GET',
      // Don't set Content-Type header - let the backend response Content-Type take precedence
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download' }));
      return {
        success: false,
        message: errorData.message || `Failed to download student data (${response.status})`,
      };
    }

    const blob = await response.blob();
    const filename = `students_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadBlob(blob, filename);

    return {
      success: true,
      message: 'Student data downloaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to download student data',
    };
  }
}

/**
 * Download teacher data as Excel (Admin only)
 */
export async function downloadTeacherData(): Promise<DownloadResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${TEACHERS_ENDPOINT}/download`, {
      method: 'GET',
      // Don't set Content-Type header - let the backend response Content-Type take precedence
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download' }));
      return {
        success: false,
        message: errorData.message || `Failed to download teacher data (${response.status})`,
      };
    }

    const blob = await response.blob();
    const filename = `teachers_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadBlob(blob, filename);

    return {
      success: true,
      message: 'Teacher data downloaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to download teacher data',
    };
  }
}

/**
 * Download games data as Excel
 */
export async function downloadGamesData(): Promise<DownloadResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${GAMES_ENDPOINT}/download`, {
      method: 'GET',
      // Don't set Content-Type header - let the backend response Content-Type take precedence
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download' }));
      return {
        success: false,
        message: errorData.message || `Failed to download games data (${response.status})`,
      };
    }

    const blob = await response.blob();
    const filename = `games_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadBlob(blob, filename);

    return {
      success: true,
      message: 'Games data downloaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to download games data',
    };
  }
}

export default {
  downloadStudentData,
  downloadTeacherData,
  downloadGamesData,
};
