# Medical parts catalog batch — 2026-10-23

User-supplied batch: 22 files. SHA-256 deduplication and A7 DOCX article comparison retain the existing A7 catalog and import 17 new device families. Shared-model catalogs remain grouped under their original model family names, without assuming all variants fit every model.

Imported content: 197 sections (181 illustrated sections and 16 supplemental tables), 1,745 numbered positions and 2,380 article/configuration entries. `counts.json` provides per-device counts. English manufacturer descriptions, quantities and configuration remarks are preserved. No prices or inferred replacement articles were invented. `/` and `N/A` from the source are retained in variants rather than turned into fake SKUs.

PDF originals and rendered DOCX PDFs are in `public/catalog/documents/medical/`; original DOCX files are retained alongside their PDF renders. `source-inventory.json` records source filenames, hashes, exact duplicates and the existing A7 disposition. All article cells from the six new Word catalogs were cross-checked against the original DOCX XML. Table-column item labels were checked against all extracted PDF tables. Full source pages remain available from the device and individual variant links.

Corrections reviewed against source:

- VP5 pump positions 5 and 6 share the same pressure-sensor article in a merged cell; both entries are retained.
- WATO EX-55/65: article `051-000768-00` crosses a page break; position 17 in section 1.8 spans a page boundary and must not merge with position 16.
- WATO EX-55Pro/65Pro: article `801-0601-00002-00` crosses a page break.
- SV600/800 expiration-valve table uses a different seven-column merge pattern.
- BeneVision N12 bottom-housing illustration mixes raster strips and vector graphics: the entire diagram region is retained, not just raster bounds.

Diagram images are rendered at 1,500 pixels wide. 97 positions in the SV600-family catalog have verified native-PDF numbered hotspot coordinates. The other raster-embedded labels have **not** been assigned guessed coordinates: these parts are selectable/searchable in the part list, and the full numbered diagram remains visible. This is a material difference from A7's fully linked native labels.

Reproduction (Python: pdfplumber, pypdfium2, Pillow): from the repository root run `scripts/medical/extract_pages.py`, `geometry.py`, `build_catalog.py`, then `render.py`. Intermediate extraction files are written under ignored `.netlify/batch-medical/`. The checked-in JSON payload is the reviewed import snapshot; later admin edits remain in the live database. DOCX PDF conversion used pinned `@matbee/libreoffice-converter@2.7.2`.

Deploy first, then run `CATALOG_ACCESS_FILE=/local/admin-access.txt node scripts/import-medical.mjs`. The importer is create-only, resumes identical records, refuses different existing records, verifies every write and checks all pre-existing catalog list entries/revisions remain unchanged. Credentials and database snapshots stay local.

Validation: `node tests/medical.test.mjs`, `npm run test:ui`, `npm run test:netlify`, TypeScript and Netlify build. All rendered section contact sheets were visually reviewed; the corrected N12 diagram was inspected separately.
