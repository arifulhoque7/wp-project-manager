# PM E2E — Dokan Alignment

Bringing the WP Project Manager e2e suites (Free `wedevs-project-manager` +
Pro `pm-pro`) up to the Dokan (`dokan-lite/tests/pw`) reference architecture.

Reference surveyed: `~/Desktop/dokan-ref/tests/pw` (and `dokan-pro`, which — like
`pm-pro` — ships **no** tests of its own; the Pro CI clones the Free host and
runs against both, the same model we use).

---

## Why

PM's e2e worked but was slow and brittle in CI. Root problems found + fixed while
aligning to Dokan's patterns:

| Symptom | Root cause | Fix (Dokan-style) |
|---|---|---|
| Every PM REST call 404 in CI | fresh wp-env = plain permalinks; PM REST needs rewrite rules | `mu-plugins/pm-e2e-env.php` forces pretty permalinks |
| Settings tab clicks hang | wp-reset welcome **pointer** overlays the page | dropped wp-reset; mu-plugin deregisters `wp-pointer` |
| **All 16 Pro specs fail** | Pro UI gated on `PM_Pro_Vars.is_license_active`; fresh wp-env has no license | `mu-plugins/pm-pro-e2e-license.php` filters the license active |
| Browser crashes on heavy Pro pages (Gantt/recharts) | wp-env default PHP memory too low | `WP_MEMORY_LIMIT: 1024M` in `.wp-env.json` |
| Failures hang 120s × 3 | `actionTimeout: 0`, `retries: 2` | bounded `actionTimeout: 15s`, `retries: 1`, `timeout: 90s` |
| Serial CI = 45m / 1h7m | `workers: 1` | `workers: 2` + `fullyParallel: false` (overlap-safe) |

---

## Dokan reference structure (target)

```
tests/pw/
├── .wp-env.json / .wp-env.ci.json / .wp-env.override.json   # env + CI overrides, memory, mappings
├── mu-plugins/                     # force-htaccess, disable-doing-it-wrong
├── global-setup.ts / global-teardown.ts
├── playwright.config.ts            # projects with dependencies (setup → tests)
├── e2e.config.ts / api.config.ts   # split config
├── types/                          # environment.d.ts, global.d.ts
├── feature-map/feature-map.yml
├── utils/                          # test.ts (fixtures), pwMatchers, apiUtils, dbUtils,
│                                   # payloads, schemas, testData, reporters, shard-durations
└── tests/
    ├── e2e/  _auth.setup.ts _site.setup.ts _env.setup.ts + feature folders (admin/, dashboard/…)
    └── api/  same setup pattern + api specs
```

Key ideas: **setup projects** run once (site → auth → env) and persist auth via
`storageState`; every spec **reuses** that state instead of re-logging-in;
**mu-plugins** make the fresh wp-env deterministic; **feature folders** organize
specs; **custom fixtures/matchers** cut boilerplate; **dynamic sharding** balances
CI wall-clock.

---

## PM current structure

```
tests/e2e-playwright/
├── .wp-env.json                    # ✅ now: 1024M memory + mu-plugins mapping
├── mu-plugins/                     # ✅ NEW
│   ├── disable-doing-it-wrong.php
│   ├── pm-e2e-env.php              # pretty permalinks + kill admin pointers
│   └── pm-pro-e2e-license.php      # (pm-pro only) force license active
├── playwright.config.ts            # single-run
├── playwright.setup.config.ts      # setup project (alpha*SetupTest)
├── playwright.parallel-one/two.config.ts   # 2 shards
├── pages/                          # page objects
├── utils/                          # testData, apiHelper, specFailFast, summaries
└── tests/                          # flat spec files (ID-prefixed)
```

---

## Phase 1 — foundation (DONE ✅)

Applied to **both** repos, verified locally against a real wp-env:

- **`.wp-env.json`**: `WP_MEMORY_LIMIT` / `WP_MAX_MEMORY_LIMIT` = `1024M`,
  `WP_DEBUG`, `mappings: { wp-content/mu-plugins: ./mu-plugins }`, dropped
  `wp-reset` from the plugin list.
- **mu-plugins** (auto-applied on boot — replaces brittle wp-cli steps):
  - `disable-doing-it-wrong.php` — silence WP notices.
  - `pm-e2e-env.php` — force pretty permalinks (PM REST) + deregister `wp-pointer`.
  - `pm-pro-e2e-license.php` (pm-pro) — filter `pm_pro_license` active so the
    license-gated Pro UI renders. `is_valid()` only reads the local option, so no
    key/secret/API needed. **This is what unblocked all 16 Pro specs.**
- **Workflows** simplified: removed the `wp rewrite`, `plugin deactivate wp-reset`,
  and `option update pm_pro_license` wp-cli steps (now handled by mu-plugins);
  stopped fetching wp-reset.
- **Config**: `actionTimeout: 15000`, `timeout: 90000`, `expect: 20000`,
  `retries: CI?1`, `workers: CI?2`, `fullyParallel: false` (overlap-safe:
  per-file isolation, unique data, per-project PM roles, no absolute-count asserts).

Result: Free ~11.7m (was 45m) green; Pro unblocked (was 16/16 features failing).

---

## Phase 2 — architecture (TODO, incremental, keep suite green each step)

1. **Auth reuse via `storageState`** *(biggest speed win)* — a `_auth.setup.ts`
   setup project logs in once per role, saves cookies; specs load `storageState`
   instead of `basicLoginAndPmVisit` in every `beforeAll` (~5–8s × 60+ specs).
2. **Setup projects with `dependencies`** — `_site.setup` (permalinks/options via
   API) → `_auth.setup` (auth) → `e2e_tests`. Mirrors Dokan's `projects[]`.
3. **`global-setup.ts` / `global-teardown.ts`** — reset `debug.log`, surface it on
   failure (Dokan maps `wp-data/debug.log`); teardown cleans seeded data.
4. **`types/`** — `environment.d.ts` (typed `process.env`), `global.d.ts`
   (`PM_Vars` / `PM_Pro_Vars`) to kill the `as unknown as {…}` casts in specs.
5. **`utils/` reorg** — `test.ts` (custom fixtures: authed page, seeded project),
   `pwMatchers.ts`, `apiUtils.ts`, `payloads.ts`, `testData.ts` split.
6. **Feature folders** — move flat specs into `tests/<feature>/` (projects/, tasks/,
   milestones/, settings/, pro: sprints/, invoices/, modules/…).
7. **Dynamic sharding** — Dokan's `shard-durations.json` + `getShardSpecs.js`
   balance shards by recorded duration instead of the hand-split lists.
8. **`.wp-env.ci.json` + override** — separate CI env (Free+Pro mapping, debug.log)
   like Dokan, selected in-workflow.

Risk note: 6 (feature folders) + 5 (fixtures) touch every spec — do per-batch,
run locally against wp-env after each, never merge red.

---

## How to run locally (wp-env, mirrors CI exactly)

```bash
cd tests/e2e-playwright
npx wp-env start                 # applies .wp-env.json (memory + mu-plugins)
# Pro also needs the Free host + support plugins under ./plugins (CI clones them)
QA_BASE_URL="http://localhost:8889" QA_ADMIN_PASSWORD="password" \
  pnpm exec playwright test <spec>
npx wp-env stop
```
mu-plugins make permalinks/license/pointers correct automatically — no manual
wp-cli setup.
