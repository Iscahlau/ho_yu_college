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
 * Convert response to Excel blob
 * Handles both binary and base64-encoded responses from API Gateway
 */
async function responseToExcelBlob(response: Response): Promise<Blob> {
  // Get response as text first to detect format
  const text = await response.text();
  
  // Check if it starts with PK (ZIP signature) - Excel files are ZIP archives
  if (text.length >= 2 && text.charCodeAt(0) === 0x50 && text.charCodeAt(1) === 0x4B) {
    // Already binary data received as text - convert back to Uint8Array
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i);
    }
    return new Blob([bytes], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }
  
  // Not binary - must be base64 encoded
  try {
    let base64String: string;
    
    // Check if response is JSON-wrapped
    if (text.trim().startsWith('{')) {
      const json = JSON.parse(text);
      if (json.body) {
        base64String = json.body;
      } else {
        throw new Error('Invalid JSON response - missing body field');
      }
    } else {
      // Direct base64 string
      base64String = text;
    }
    
    // Decode base64 to binary
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  } catch (error) {
    console.error('Failed to decode Excel file:', error, 'Response preview:', text.substring(0, 100));
    throw new Error('Failed to decode Excel file from server response');
  }
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download' }));
      return {
        success: false,
        message: errorData.message || `Failed to download student data (${response.status})`,
      };
    }

    const blob = await responseToExcelBlob(response);
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download' }));
      return {
        success: false,
        message: errorData.message || `Failed to download teacher data (${response.status})`,
      };
    }

    const blob = await responseToExcelBlob(response);
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download' }));
      return {
        success: false,
        message: errorData.message || `Failed to download games data (${response.status})`,
      };
    }

    const blob = await responseToExcelBlob(response);
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
