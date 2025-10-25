/**
 * Games Service
 * Handles game-related API calls
 */

import api, { ApiResponse } from './api';
import type { Game } from '../store/slices/gamesSlice';
import type { ScratchProject } from '../types';

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
    description: apiGame.description,
    thumbnailUrl: apiGame.thumbnailUrl,
  };
}

/**
 * Fetch all games
 */
export async function fetchGames(): Promise<ApiResponse<Game[]>> {
  const response = await api.apiFetch<any>(GAMES_ENDPOINT);

  if (response.success && response.data) {
    // Backend returns { items: [...], count: number, hasMore: boolean }
    const items = response.data.items || [];
    return {
      success: true,
      data: items.map(transformGameData),
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
 * Track game click and update student marks
 * @param gameId - The game ID
 * @param studentId - Optional student ID (only for students)
 * @param role - Optional user role ('student' | 'teacher' | 'admin')
 * @returns Response containing updated click count and marks (if student)
 */
export async function trackGameClick(
  gameId: string,
  studentId?: string,
  role?: 'student' | 'teacher' | 'admin'
): Promise<ApiResponse<{ accumulated_click: number; marks?: number }>> {
  return api.apiFetch<{ accumulated_click: number; marks?: number }>(
    `${GAMES_ENDPOINT}/${gameId}/click`,
    {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        role: role,
      }),
    }
  );
}

/**
 * Increment game click count (deprecated - use trackGameClick instead)
 */
export async function incrementGameClick(gameId: string): Promise<ApiResponse<void>> {
  return api.apiFetch<void>(`${GAMES_ENDPOINT}/${gameId}/click`, {
    method: 'POST',
  });
}

/**
 * Fetch game metadata from Scratch API
 * @param scratchId - The Scratch project ID
 * @returns ScratchProject object with title and image, or null if failed
 * 
 * @example
 * const project = await fetchScratchProject('60917032');
 * if (project) {
 *   console.log(project.title); // Game name
 *   console.log(project.image); // Thumbnail URL
 * }
 */
export async function fetchScratchProject(scratchId: string): Promise<ScratchProject | null> {
  const SCRATCH_API_BASE = import.meta.env.VITE_SCRATCH_API_BASE || 'https://api.scratch.mit.edu/projects';
  
  try {
    const response = await fetch(`${SCRATCH_API_BASE}/${scratchId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Scratch project: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data as ScratchProject;
  } catch (error) {
    console.error(`Error fetching Scratch project ${scratchId}:`, error);
    return null;
  }
}

/**
 * Extract game name from Scratch project
 * @param scratchId - The Scratch project ID
 * @returns The game title, or a fallback string if failed
 */
export async function fetchScratchGameName(scratchId: string): Promise<string> {
  const project = await fetchScratchProject(scratchId);
  return project?.title || `Game ${scratchId}`;
}

/**
 * Extract thumbnail URL from Scratch project
 * @param scratchId - The Scratch project ID
 * @returns The thumbnail URL, or null if failed
 * 
 * @example
 * const thumbnailUrl = await fetchScratchThumbnail('60917032');
 * // Returns: "https://cdn2.scratch.mit.edu/get_image/project/60917032_480x360.png"
 */
export async function fetchScratchThumbnail(scratchId: string): Promise<string | null> {
  const project = await fetchScratchProject(scratchId);
  return project?.image || null;
}

/**
 * Enrich game data with Scratch API metadata
 * Updates game name and thumbnail if they're missing or generic
 * @param game - The game object to enrich
 * @returns Enhanced game object with Scratch metadata
 * 
 * @example
 * const enrichedGame = await enrichGameWithScratchData(game);
 */
export async function enrichGameWithScratchData(game: Game): Promise<Game> {
  // Extract Scratch ID from game
  const scratchIdMatch = game.scratchApi.match(/\/projects\/(\d+)/);
  const scratchId = scratchIdMatch ? scratchIdMatch[1] : game.scratchId;
  
  if (!scratchId) {
    return game;
  }
  
  try {
    const project = await fetchScratchProject(scratchId);
    if (project) {
      return {
        ...game,
        // Use Scratch title if game name is generic or missing
        gameName: game.gameName.startsWith('Game ') || !game.gameName 
          ? project.title 
          : game.gameName,
        // Use Scratch thumbnail if not set
        thumbnailUrl: game.thumbnailUrl || project.image,
      };
    }
  } catch (error) {
    console.error(`Failed to enrich game ${game.gameId} with Scratch data:`, error);
  }
  
  return game;
}

export default {
  fetchGames,
  fetchGameById,
  trackGameClick,
  incrementGameClick,
  fetchScratchProject,
  fetchScratchGameName,
  fetchScratchThumbnail,
  enrichGameWithScratchData,
};
