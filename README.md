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
- Schema: apply all numbered files in `netlify/migrations/` in order through a direct database connection before deploying. Existing rows are preserved.
- Images up to 12 MiB upload in 3 MiB chunks when needed. AI scans use background Responses requests and polling; results remain editable drafts.
- Validate: `npm run test:netlify`, `npx tsc --noEmit`, `npm run build:netlify`.
- Deploy with an authorized Netlify CLI: `netlify deploy --prod`.
- `.env.netlify.local`, `.netlify/`, build outputs, and administrator credentials are local-only and must never be committed.

`setup-netlify.mjs` is the initial migration helper: it reads a local catalog export from `.netlify/catalog-migration.json`, initializes an empty database without replacing an existing catalog, and stores secrets in Netlify production and deploy-preview contexts. It writes generated admin access details one directory above the checkout. Keep that file private. To rotate admin access, update the password hash and session secret in Netlify and redeploy; rotating the session secret invalidates all old cookies.

The deployment was verified using API integration tests and remote catalog/auth/upload checks. The OpenAI model-access endpoint was checked; no paid image-analysis request was used in deployment testing.

## Visitor cart

The catalog cart is a browser-local shortlist, keyed by drawing ID and part ID. The right detail card shows part information above a live cart list. Visitors choose an amount (1–999) before adding, can adjust quantities or remove lines in that lower section, and can return to a saved part's diagram. Adding a part keeps its drawing callout and list row marked across drawing changes and reloads. The data is stored in `localStorage` under `detal-cart-v1`; when browser storage is unavailable, it lasts only for the open page. Unit prices, line totals and the subtotal for priced lines appear in both cart views. Missing and demo prices are flagged, and the subtotal is not a final quote.

Visitors can submit up to 30 distinct lines as an order request with their name and phone number. `/api/orders` re-reads all parts and prices from the catalog, then stores the request in Neon. The cart remains in the browser after submission. Admins see requests in the catalog admin panel and can mark them new, contacted or closed. Admins must confirm availability, variant and final price with the customer; the site does not take payment. Requests are limited to five per IP per hour. Validation: `npm run test:ui` and `npm run test:netlify`.

## PDF catalogs on Netlify

Admin → New drawing → **Butun PDFdan sxemalarni topish** accepts one PDF (up to 40 MiB / 50 pages). Self-hosted Mozilla PDF.js renders the document. `/api/pdf-layout` submits all page previews together for structured, asynchronous layout detection: zero/multiple schematics per page and matching parts tables on other pages. A PDF page is never automatically treated as a catalog item.

Review the detected model names and editable region rectangles before scanning. The manual region control can add a missed schematic, including a second region on the same page. Each chosen assembly is rendered with its diagrams on the left and associated tables on the right, then enters the existing OCR / AI queue. PDF filename, page numbers and crop regions are retained on the model. Results remain drafts until saved. Existing catalog data is not rewritten by importing a PDF.

Keep the page open while extracting and submitting. Cached layout request IDs let the same PDF retrieve its existing analysis on retry. The upload queue itself is in memory; reloading loses unsubmitted drafts. Background jobs continue only after server acceptance. Layout detection shares the existing 10 AI attempts/hour limit with part analysis; a larger queue can be paused and resumed later. OCR and manual region selection do not require paid AI calls. AI grouping is approximate and must be reviewed; region editing is provided for missed or incorrectly grouped schemes.

Validation: `npm run test:pdf` renders an actual three-page synthetic PDF and tests two schematics on one page, cross-page table composition and geometry limits. `npm run test:netlify` covers authenticated layout submission/polling, caching, CSRF and result-type isolation with mocked inference. `npm run test:ui` checks existing interactions and PDF markup initialization. The real API accepted the synthetic document request but failed with `credit_balance_exhausted`; live model detection accuracy has not been verified. Fund the existing OpenAI account before using automatic detection; manual PDF regions + OCR remain available.
