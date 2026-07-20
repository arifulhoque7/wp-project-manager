import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Reset the wp-env debug log so a run's surfaced PHP notices/errors reflect only
// that run. wp-data/debug.log is bind-mounted into the container (.wp-env.json
// `mappings` + `WP_DEBUG_LOG`); CI prints/uploads it on failure. Best-effort:
// harmless when running against a hosted QA site (no wp-data mount).
export default async function globalSetup(): Promise<void> {
  try {
    const dir = join(process.cwd(), 'wp-data');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'debug.log'), '');
  } catch (e) {
    console.warn(`[global-setup] could not reset debug.log: ${(e as Error).message}`);
  }
}
