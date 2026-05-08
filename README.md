# CV - Krzysztof Pajak

Professional CV as Markdown, HTML, and PDF.

## Files

- **`CV.md`** - Source of truth. Edit this file to update your CV.
- **`CV.html`** - Generated styled HTML (two-column layout).
- **`Krzysztof_Pajak_CV.pdf`** - Generated single-page A4 PDF.
- **`build.mjs`** - Script that generates HTML and PDF from `CV.md`.

## Usage

Edit `CV.md`, then rebuild:

```bash
npm run build
```

This regenerates both `CV.html` and `Krzysztof_Pajak_CV.pdf` from the Markdown source.

## Setup

Requires Node.js and Microsoft Edge (used for PDF rendering via Puppeteer).

```bash
npm install
```
