# Frontend Source Code

This directory contains the React application source code for the Ho Yu College Scratch Game Platform.

## Directory Structure

```
src/
├── components/         # Reusable UI components
│   ├── Layout/        # Main application layout wrapper
│   ├── Navbar/        # Navigation bar component
│   └── ...            # Other shared components
├── pages/             # Page-level components
│   ├── Homepage/      # Game library with filters
│   ├── Login/         # Student/Teacher authentication
│   ├── Game/          # Scratch game player
│   └── Admin/         # Admin dashboard
├── store/             # Redux state management
│   ├── slices/        # Redux slices
│   │   ├── authSlice.ts    # Authentication state
│   │   └── gamesSlice.ts   # Games and filters state
│   └── store.ts       # Store configuration
├── i18n/              # Internationalization
│   ├── config.ts      # i18next configuration
│   └── locales/       # Translation files
│       ├── en.json    # English translations
│       └── zh.json    # Chinese translations
├── services/          # API service layer
│   ├── api.ts         # Base API client
│   ├── authService.ts # Authentication API calls
│   └── gamesService.ts # Games API calls
├── types/             # TypeScript type definitions
│   └── index.ts       # Shared types and interfaces
├── utils/             # Utility functions
│   ├── constants.ts   # Application constants
│   └── helpers.ts     # Helper functions
├── App.tsx            # Root application component
├── main.tsx           # Application entry point
└── vite-env.d.ts      # Vite environment types

## Key Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Material UI v7** - Component library
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **i18next** - Internationalization
- **Vite** - Build tool

## State Management

The application uses Redux Toolkit for state management with the following slices:

### Auth Slice
- User authentication state
- Login/logout actions
- User profile data (name, marks, role)
- Login timestamp for timer tracking

### Games Slice
- Games list
- Filtered games based on subject and difficulty
- Loading and error states
- Filter actions

## Internationalization

The application supports two languages:
- **English (en)** - Default language
- **Chinese (zh)** - Traditional Chinese

Translations are managed through i18next and stored in JSON files under `i18n/locales/`.

## API Services

All API calls are centralized in the `services/` directory:

### authService
- `login(id, password)` - Authenticate user
- `logout()` - Clear session
- `isAuthenticated()` - Check auth status

### gamesService
- `fetchGames()` - Get all games
- `fetchGameById(id)` - Get single game
- `incrementGameClick(id)` - Update play count
- `fetchScratchProject(id)` - Get Scratch metadata (title, image, description, etc.)
- `fetchScratchGameName(id)` - Get game title from Scratch API
- `fetchScratchThumbnail(id)` - Get thumbnail URL from Scratch API

## Environment Variables

Environment variables are defined in `.env` and typed in `vite-env.d.ts`:

- `VITE_API_URL` - Backend API base URL
- `VITE_LOGIN_ENDPOINT` - Login endpoint path
- `VITE_GAMES_ENDPOINT` - Games endpoint path
- `VITE_SCRATCH_API_BASE` - Scratch API URL (default: `https://api.scratch.mit.edu/projects`)
- `VITE_SCRATCH_EMBED_BASE` - Scratch embed URL (default: `https://scratch.mit.edu/projects`)
- `VITE_TIMER_WARNING` - Timer duration (ms)
- `VITE_MAX_FILE_SIZE` - Upload size limit (bytes)

## Scratch API Integration

The application integrates with the Scratch API to fetch game metadata including titles, thumbnails, descriptions, and other project information.

### Features

- **Automatic Game Name Retrieval**: Game titles are fetched from Scratch API using the project ID
- **Thumbnail Display**: Game thumbnails are retrieved and displayed in the UI
- **Fallback Handling**: If the API is unavailable, the app uses default thumbnails and generic names
- **Error Handling**: Graceful error handling with user-friendly messages

### Usage

#### Fetching Game Metadata

```typescript
import { fetchScratchProject, fetchScratchGameName, fetchScratchThumbnail } from './services/gamesService';

// Get full project metadata
const project = await fetchScratchProject('60917032');
if (project) {
  console.log(project.title);        // Game name
  console.log(project.image);        // Thumbnail URL
  console.log(project.description);  // Description
  console.log(project.instructions); // Instructions
  console.log(project.author.username); // Author
}

// Get just the game name
const gameName = await fetchScratchGameName('60917032');
// Returns: "Castle Defender ⚔️" or "Game 60917032" if failed

// Get just the thumbnail URL
const thumbnailUrl = await fetchScratchThumbnail('60917032');
// Returns: "https://cdn2.scratch.mit.edu/get_image/project/60917032_480x360.png"
```

#### Helper Functions

```typescript
import { extractScratchId, getDefaultScratchThumbnail } from './utils/helpers';

// Extract Scratch ID from URL
const id = extractScratchId('https://scratch.mit.edu/projects/123456');
// Returns: '123456'

// Get default thumbnail URL (fallback)
const thumbnailUrl = getDefaultScratchThumbnail('123456');
// Returns: "https://cdn2.scratch.mit.edu/get_image/project/123456_480x360.png"
```

### API Response Format

The Scratch API returns a `ScratchProject` object with the following structure:

```typescript
interface ScratchProject {
  id: number;
  title: string;
  description: string;
  instructions: string;
  author: {
    username: string;
  };
  image: string;  // Thumbnail URL
}
```

### Error Handling

The application handles API failures gracefully:

1. **API Unavailable**: Shows a warning but continues to display the game with fallback data
2. **Invalid Project ID**: Returns null and uses fallback values
3. **Network Errors**: Logs errors to console and uses default values

Example:
```typescript
const project = await fetchScratchProject('invalid-id');
if (!project) {
  // Use fallback values
  const title = `Game ${scratchId}`;
  const thumbnail = getDefaultScratchThumbnail(scratchId);
}
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Component Architecture

### Pages
Each page is a self-contained component in its own directory with an index.ts for clean imports.

### Components
Reusable components are stored in the `components/` directory. They should be:
- Stateless when possible
- Use TypeScript for props
- Follow Material UI patterns

### Layout
The `Layout` component wraps all pages and provides:
- Common navbar
- Consistent spacing
- Responsive structure

## Routing

Routes are defined in `App.tsx` using React Router:

- `/` - Homepage (game library)
- `/login` - Login page
- `/game/:gameId` - Game player
- `/admin` - Admin dashboard

## Type Safety

All API responses, state, and props are typed using TypeScript. Type definitions are centralized in `types/index.ts`.

## Best Practices

1. **Use hooks** - Prefer functional components with hooks
2. **Type everything** - All functions and components should be typed
3. **Centralize API calls** - Never call fetch directly in components
4. **Use constants** - Avoid magic strings and numbers
5. **i18n all text** - Use `t()` function for all user-facing text
6. **Redux for shared state** - Use Redux for state shared across components
7. **Material UI components** - Use MUI components for consistency
