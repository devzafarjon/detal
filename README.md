# Detal catalog

Owner-private Sites app. Frontend: public/catalog/. API: app/api/. D1 stores the catalog with optimistic revision checks; R2 stores uploaded JPG/PNG/WebP files.

Run npm run dev. Local database migrations are separate from hosted migrations. Build with the Sites build helper. Never change the Site audience without adding authorization for shared write routes.

OCR uses Tesseract.js 6.0.1 in the browser. It downloads the engine/language files from its CDN; drawings are stored in this Site and processed in the browser. The image is split by the user-selected diagram width. Line removal and connected-component cleanup improve label recognition. Table rows are associated by position number. All extracted data is unverified; OCR does not translate names or infer prices. Empty prices remain null.

Local API integration checks: node tests/api.test.mjs after creating the local TEST-P25 edit fixture through the admin UI. Test records are local only and are never packaged.
