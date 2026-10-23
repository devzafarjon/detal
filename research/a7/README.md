# A7 manufacturer parts catalog

Source: `public/catalog/documents/A7_Parts_EN_V1.0.pdf` (27 pages).

Imported all sections 1.1.1–1.1.18: 17 illustrated sections (Structure combines front and rear views) and the supplemental parts list. Total: 170 numbered positions, 206 article/configuration entries. Position numbers are scoped to each section. English descriptions, quantities and configuration remarks are retained from the source; section titles are Uzbek. No prices or compatibility guesses were added.

`sections.json` records extracted table entries, source pages and PDF crop boxes (points, top-left coordinates). `catalog.json` is the complete import payload with image-space hotspots. Images were rendered at 3 pixels per PDF point. Every circled diagram number was matched against its section's parts table. The supplemental list has no invented hotspots.

Extraction review corrections: the merged item 28 cell on page 5 continues onto page 6; its four AIR yoke variants belong to 28, not 27. Page 24 completes the EFCS item 3 description `proportional valve module(0635/O2/AIR)` and its configuration remarks. Merged remarks are carried across their configuration variants. Empty quantities are retained rather than assumed.

Validation: `node tests/a7.test.mjs`, `npm run test:ui`, `npm run test:netlify`.

Deploy the frontend/API before importing because the validator must recognize the new bundled image paths. Import using `CATALOG_ACCESS_FILE=/path/to/local-access-file node scripts/import-a7.mjs`. Credentials stay local. The importer creates only IDs 710001–710018, verifies each write, and refuses to overwrite differing existing A7 records. The GitHub dataset is the original import snapshot; later admin edits remain in the live database.

Direct catalog link: https://detal-demo.netlify.app/catalog/?device=a7
