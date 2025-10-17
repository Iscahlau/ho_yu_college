/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_LOGIN_ENDPOINT: string;
  readonly VITE_GAMES_ENDPOINT: string;
  readonly VITE_STUDENTS_ENDPOINT: string;
  readonly VITE_TEACHERS_ENDPOINT: string;
  readonly VITE_UPLOAD_ENDPOINT: string;
  readonly VITE_DOWNLOAD_ENDPOINT: string;
  readonly VITE_SCRATCH_API_BASE: string;
  readonly VITE_SCRATCH_EMBED_BASE: string;
  readonly VITE_TIMER_WARNING: string;
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_MAX_FILE_ROWS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
