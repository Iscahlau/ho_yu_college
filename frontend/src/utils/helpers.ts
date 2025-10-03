/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

/**
 * Format marks with proper number display
 */
export function formatMarks(marks: number): string {
  return marks.toLocaleString();
}

/**
 * Get marks for difficulty level
 */
export function getMarksForDifficulty(difficulty: string): number {
  switch (difficulty) {
    case 'Beginner':
      return 10;
    case 'Intermediate':
      return 20;
    case 'Advanced':
      return 30;
    default:
      return 0;
  }
}

/**
 * Format student name
 */
export function formatStudentName(name1: string, name2: string): string {
  return `${name1} ${name2}`;
}

/**
 * Validate file size (max 10 MB)
 */
export function validateFileSize(file: File): boolean {
  const MAX_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760');
  return file.size <= MAX_SIZE;
}

/**
 * Validate file format (Excel or CSV)
 */
export function validateFileFormat(file: File): boolean {
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate Scratch embed URL
 */
export function getScratchEmbedUrl(scratchId: string): string {
  const SCRATCH_EMBED_BASE = import.meta.env.VITE_SCRATCH_EMBED_BASE || 'https://scratch.mit.edu/projects';
  return `${SCRATCH_EMBED_BASE}/${scratchId}/embed`;
}

/**
 * Get timer warning duration in milliseconds
 */
export function getTimerWarningDuration(): number {
  return parseInt(import.meta.env.VITE_TIMER_WARNING || '3600000');
}
