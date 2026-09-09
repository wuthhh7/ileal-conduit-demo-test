declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    LINE_CHANNEL_SECRET?: string;
    LINE_CHANNEL_ACCESS_TOKEN?: string;
    DASHBOARD_PASSWORD?: string;
    NURSE_PHONE?: string;
    PUBLIC_BASE_URL?: string;
  }
}
