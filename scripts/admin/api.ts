/** Shapes the admin server sends to the page. Types only, so the page can import them for free. */

export interface ClipRow {
  clipId: string;
  /** What the device voice reads. */
  speech: string;
  /** The normal spelling to show, when it differs from `speech`. */
  display?: string;
  group: string;
  recorded: boolean;
  hasBackup: boolean;
}

export interface ClipListResponse {
  language: 'he' | 'en';
  languageName: string;
  speechLang: string;
  direction: 'rtl' | 'ltr';
  ffmpegReady: boolean;
  ffmpegHelp: string;
  clips: ClipRow[];
}

export interface PublishStatusResponse {
  branch: string;
  files: string[];
  message: string;
}

export interface PublishResponse {
  ok: boolean;
  committed: boolean;
  output: string;
}

export interface ErrorResponse {
  error: string;
}
