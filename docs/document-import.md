# Document and image imports

The document picker accepts any extension. PDF files go straight to PDF.js. Browser-decodable images become a PDF sheet through pdf-lib. Other files are opened by a pinned LibreOffice WASM runtime and exported as PDF, preserving pages, slides, tables and drawing objects rather than merely extracting embedded images. The existing whole-document layout analysis then finds individual schematics and associated tables. Source filenames are retained in import metadata.

This is broad format support, not a promise to decode every file format. Unsupported, corrupt and encrypted inputs produce an explicit error. Tested formats: DOCX, PPTX (two slides, native shapes and text), XLSX, TIFF, TXT, RTF, CSV and HTML. Other LibreOffice-readable formats are attempted without extension filtering. Browser image path covers JPEG, PNG, WebP, GIF, BMP, AVIF, SVG and ICO; animations are flattened to one frame. File size limit is 40 MiB; rendered documents retain the 50-page limit. Office layouts/fonts can differ and should be previewed before scanning.

The 2.7.2 converter runtime is copied from npm into the Netlify static output during build, **not** committed as large binary files to Git. It is loaded only for non-PDF, non-browser-image input. First download is approximately 240 MiB. Heavy processing runs in a Web Worker and has a four-minute timeout plus bounded cleanup. Large documents are best imported on desktop. The site sends COOP/COEP headers under `/catalog/` to enable SharedArrayBuffer; credentialless embedding retains public CDN OCR script support.

Conversion happens locally. When the user requests AI analysis, rendered pages are sent through the existing authenticated AI endpoints. Converting a file does not require an AI call. The existing manual region-selection path remains available without AI. No separate paid conversion service or conversion API key is required.

Verification: `npm run test:documents`, `npm run test:pdf`, `npm run test:ui`, `npm run build:netlify`. The integration test uses the actual WASM engine and checks page counts and text in rendered PDFs; it writes previews to ignored `.netlify/document-tests/`. Fixtures are synthetic. Browser surface automation was unavailable in the session; hosted asset responses and isolation headers are checked separately.

## Third-party components

- [LibreOffice converter](https://github.com/matbeedotcom/libreoffice-document-converter), pinned npm `@matbee/libreoffice-converter@2.7.2`, MPL-2.0. Source and build instructions are in the linked repository. The bundled LibreOffice runtime is derived from [LibreOffice](https://www.libreoffice.org/about-us/licenses/) (MPL-2.0 / LGPLv3+).
- [pdf-lib](https://github.com/Hopding/pdf-lib), pinned 1.17.1, MIT.
- Existing PDF.js provides PDF rendering.
