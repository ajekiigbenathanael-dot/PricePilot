/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional API origin for the browser client. Default: same-origin `/api`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
