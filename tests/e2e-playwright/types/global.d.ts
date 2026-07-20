// Browser globals injected by the PM plugin (Free) and pm-pro (Pro), typed so
// specs can read them inside page.evaluate() without `as unknown as { … }` casts.
export {};

declare global {
  interface PmVars {
    rest_url: string;
    permission: string;
    is_admin: unknown;
    is_pro?: unknown;
    [key: string]: unknown;
  }
  interface PmProVars {
    rest_url?: string;
    permission?: string;
    is_admin?: unknown;
    is_license_active?: unknown;
    active_modules?: string[];
    [key: string]: unknown;
  }
  interface Window {
    PM_Vars: PmVars;
    PM_Pro_Vars?: PmProVars;
    PM?: Record<string, unknown>;
  }
}
