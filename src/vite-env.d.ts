/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** DSN del proyecto cafeta-admin en Sentry; vacío fuera de producción (spec 0007). */
  readonly VITE_SENTRY_DSN?: string;
  /** Commit desplegado; lo pone el job deploy con github.sha (spec 0007). */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
