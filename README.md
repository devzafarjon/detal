# Detal catalog

Owner-private Sites app. Frontend: public/catalog/. API: app/api/. D1 stores the catalog with optimistic revision checks; R2 stores uploaded JPG/PNG/WebP files.

Run npm run dev. Local database migrations are separate from hosted migrations. Build with the Sites build helper. Never change the Site audience without adding authorization for shared write routes.

OCR uses Tesseract.js 6.0.1 in the browser. It downloads the engine/language files from its CDN; drawings are stored in this Site and processed in the browser. The image is split by the user-selected diagram width. Line removal and connected-component cleanup improve label recognition. Table rows are associated by position number. All extracted data is unverified; OCR does not translate names or infer prices. Empty prices remain null.

Local API integration checks: node tests/api.test.mjs after creating the local TEST-P25 edit fixture through the admin UI. Test records are local only and are never packaged.

## AI Vision scanner

Server route: /api/scan-ai. Configure OPENAI_API_KEY as a Sites production secret through the OpenAI Developers API-key workflow. Optional OPENAI_VISION_MODEL defaults to gpt-4.1. Never put the key in client code or hosting.json. Redeploy after changing environment variables. Without a key the AI controls are disabled and plain OCR remains usable.

One Responses API request receives an overview and four overlapping diagram crops. Output uses a strict JSON schema, normalized crop coordinates and server validation. All results require review. Names may be translated; prices are never invented. Rescan preserves existing prices and nonempty articles, merges draft positions, and does not save automatically. D1 limits calls to 10 attempts per hour for this owner-private Site. This is an attempt limit, not a monetary spend cap. Model access, balance and billing must be verified after activation. No real-model accuracy claim is made until tested on the user's images.

Test: npx tsx tests/diagram-ai.test.ts. Verifies coordinate mapping, invalid model output, duplicate review and null prices using synthetic fixtures, not live inference.


## Netlify deployment

The Netlify target uses `netlify.toml` and `npm run build:netlify`. It bundles the existing API handlers with a Neon Postgres adapter and Netlify Blobs storage; the Cloudflare target remains available through `npm run dev`.

- Production: https://detal-demo.netlify.app
- Admin: `/admin/` (email/password, secure 8-hour cookie; no public registration).
- Required secret variables: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (`salt:scrypt_hex`), `SESSION_SECRET`, and `OPENAI_API_KEY`. Optional: `OPENAI_VISION_MODEL`.
- Schema: `netlify/migrations/001_catalog.sql`. Apply through a direct database connection before deploying. Existing rows are preserved.
- Images up to 12 MiB upload in 3 MiB chunks when needed. AI scans use background Responses requests and polling; results remain editable drafts.
- Validate: `npm run test:netlify`, `npx tsc --noEmit`, `npm run build:netlify`.
- Deploy with an authorized Netlify CLI: `netlify deploy --prod`.
- `.env.netlify.local`, `.netlify/`, build outputs, and administrator credentials are local-only and must never be committed.

`setup-netlify.mjs` is the initial migration helper: it reads a local catalog export from `.netlify/catalog-migration.json`, initializes an empty database without replacing an existing catalog, and stores secrets in Netlify production and deploy-preview contexts. It writes generated admin access details one directory above the checkout. Keep that file private. To rotate admin access, update the password hash and session secret in Netlify and redeploy; rotating the session secret invalidates all old cookies.

The deployment was verified using API integration tests and remote catalog/auth/upload checks. The OpenAI model-access endpoint was checked; no paid image-analysis request was used in deployment testing.
