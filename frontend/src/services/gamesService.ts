/**
 * Games Service
 * Handles game-related API calls
 */

import api, { ApiResponse } from './api';
import type { Game } from '../store/slices/gamesSlice';

const GAMES_ENDPOINT = import.meta.env.VITE_GAMES_ENDPOINT || '/games';

/**
 * Transform API response from snake_case to camelCase
 */
function transformGameData(apiGame: any): Game {
  return {
    gameId: apiGame.game_id,
    gameName: apiGame.game_name,
    studentId: apiGame.student_id,
    subject: apiGame.subject,
    difficulty: apiGame.difficulty,
    teacherId: apiGame.teacher_id,
    lastUpdate: apiGame.last_update,
    scratchId: apiGame.scratch_id,
    scratchApi: apiGame.scratch_api,
    accumulatedClick: apiGame.accumulated_click,
    thumbnailUrl: apiGame.thumbnailUrl,
  };
}

/**
 * Fetch all games
 */
export async function fetchGames(): Promise<ApiResponse<Game[]>> {
  const response = await api.apiFetch<any[]>(GAMES_ENDPOINT);
  
  if (response.success && response.data) {
    return {
      ...response,
      data: response.data.map(transformGameData),
    };
  }
  
  return response as ApiResponse<Game[]>;
}

/**
 * Fetch a single game by ID
 */
export async function fetchGameById(gameId: string): Promise<ApiResponse<Game>> {
  const response = await api.apiFetch<any>(`${GAMES_ENDPOINT}/${gameId}`);
  
  if (response.success && response.data) {
    return {
      ...response,
      data: transformGameData(response.data),
    };
  }
  
  return response as ApiResponse<Game>;
}

/**
 * Increment game click count
 */
export async function incrementGameClick(gameId: string): Promise<ApiResponse<void>> {
  return api.apiFetch<void>(`${GAMES_ENDPOINT}/${gameId}/click`, {
    method: 'POST',
  });
}

/**
 * Fetch game metadata from Scratch API
 */
export async function fetchScratchProject(scratchId: string): Promise<any> {
  const SCRATCH_API_BASE = import.meta.env.VITE_SCRATCH_API_BASE || 'https://api.scratch.mit.edu/projects';
  
  try {
    const response = await fetch(`${SCRATCH_API_BASE}/${scratchId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Scratch project');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Scratch project:', error);
    return null;
  }
}

export default {
  fetchGames,
  fetchGameById,
  incrementGameClick,
  fetchScratchProject,
};
