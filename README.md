# Detal catalog

Owner-private Sites app. Frontend: public/catalog/. API: app/api/. D1 stores the catalog with optimistic revision checks; R2 stores uploaded JPG/PNG/WebP files.

Run npm run dev. Local database migrations are separate from hosted migrations. Build with the Sites build helper. Never change the Site audience without adding authorization for shared write routes.

OCR uses Tesseract.js 6.0.1 in the browser. It downloads the engine/language files from its CDN; drawings are stored in this Site and processed in the browser. The image is split by the user-selected diagram width. Line removal and connected-component cleanup improve label recognition. Table rows are associated by position number. All extracted data is unverified; OCR does not translate names or infer prices. Empty prices remain null.

Local API integration checks: node tests/api.test.mjs after creating the local TEST-P25 edit fixture through the admin UI. Test records are local only and are never packaged.

## AI Vision scanner

Server route: /api/scan-ai. Configure OPENAI_API_KEY as a Sites production secret through the OpenAI Developers API-key workflow. Optional OPENAI_VISION_MODEL defaults to gpt-4.1. Never put the key in client code or hosting.json. Redeploy after changing environment variables. Without a key the AI controls are disabled and plain OCR remains usable.

One Responses API request receives an overview and four overlapping diagram crops. Output uses a strict JSON schema, normalized crop coordinates and server validation. All results require review. Names may be translated; prices are never invented. Rescan preserves existing prices and nonempty articles, merges draft positions, and does not save automatically. D1 limits calls to 10 attempts per hour for this owner-private Site. This is an attempt limit, not a monetary spend cap. Model access, balance and billing must be verified after activation. No real-model accuracy claim is made until tested on the user's images.

Test: npx tsx tests/diagram-ai.test.ts. Verifies coordinate mapping, invalid model output, duplicate review and null prices using synthetic fixtures, not live inference.
