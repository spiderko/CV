import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = resolve(__dirname, 'CV.md');
const htmlPath = resolve(__dirname, 'CV.html');
const pdfPath = resolve(__dirname, 'Krzysztof_Pajak_CV.pdf');

// ── Parse CV.md ──

const md = readFileSync(mdPath, 'utf-8');
const lines = md.split('\n');

let name = '';
let role = '';
let address = '';
let contactLine = '';
let profile = '';
const skills = [];       // { category, items[] }
const jobs = [];         // { title, company, date, location, desc, bullets[] }
const education = [];    // { title, school, date }

let section = '';        // current h2 section
let currentJob = null;
let currentSkillCategory = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // h1 — name
  if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
    name = trimmed.replace('# ', '');
    continue;
  }

  // Role line (bold text right after name)
  if (!role && trimmed.match(/^\*\*(.+)\*\*$/) && !section) {
    role = trimmed.replace(/\*\*/g, '');
    continue;
  }

  // h2 — section header
  if (trimmed.startsWith('## ')) {
    section = trimmed.replace('## ', '').toLowerCase();
    continue;
  }

  // Skip horizontal rules
  if (trimmed === '---') continue;
  if (trimmed === '') continue;

  // ── Contact / Address (before any section) ──
  if (!section) {
    if (trimmed.includes('@') || trimmed.includes('LinkedIn') || trimmed.includes('GitHub')) {
      contactLine = trimmed;
    } else if (trimmed.match(/[A-Z]{1,2}\d/)) {
      address = trimmed;
    }
    continue;
  }

  // ── Profile ──
  if (section === 'profile') {
    profile += (profile ? ' ' : '') + trimmed;
    continue;
  }

  // ── Technical Skills ──
  if (section === 'technical skills') {
    const boldMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (boldMatch) {
      skills.push({ category: boldMatch[1], items: boldMatch[2].split(',').map(s => s.trim()) });
    }
    continue;
  }

  // ── Experience ──
  if (section === 'experience') {
    // h3 — job title
    if (trimmed.startsWith('### ')) {
      if (currentJob) jobs.push(currentJob);
      currentJob = { title: trimmed.replace('### ', ''), company: '', date: '', location: '', desc: '', bullets: [] };
      continue;
    }

    if (currentJob) {
      // Company line: **Company** | Date | Location
      const companyMatch = trimmed.match(/^\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+)$/);
      if (companyMatch) {
        currentJob.company = companyMatch[1];
        currentJob.date = companyMatch[2];
        currentJob.location = companyMatch[3];
        continue;
      }

      // Bullet point
      if (trimmed.startsWith('- ')) {
        currentJob.bullets.push(trimmed.replace('- ', ''));
        continue;
      }

      // Description paragraph (non-bullet text after company line)
      if (currentJob.company && !trimmed.startsWith('-')) {
        currentJob.desc += (currentJob.desc ? ' ' : '') + trimmed;
      }
    }
    continue;
  }

  // ── Education ──
  if (section === 'education') {
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      education.push({ title: boldMatch[1], school: '' });
      continue;
    }
    if (education.length > 0 && !education[education.length - 1].school) {
      education[education.length - 1].school = trimmed;
    }
    continue;
  }
}
if (currentJob) jobs.push(currentJob);

// ── Parse contact details ──

function extractLink(text, label) {
  const match = text.match(new RegExp(`\\[${label}\\]\\((.+?)\\)`));
  return match ? match[1] : '';
}

function extractEmail(text) {
  const match = text.match(/\[(.+?@.+?)\]/);
  return match ? match[1] : '';
}

function extractPhone(text) {
  const match = text.match(/([\d\s]{10,})/);
  return match ? match[1].trim() : '';
}

const email = extractEmail(contactLine);
const phone = extractPhone(contactLine);
const linkedin = extractLink(contactLine, 'LinkedIn');
const github = extractLink(contactLine, 'GitHub');
const githubDisplay = github.replace('https://github.com/', 'github.com/');

// ── SVG Icons ──

const icons = {
  location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>'
};

// ── Highlight map for key skills ──

const highlightSkills = new Set(['C#', 'TypeScript', 'T-SQL', '.NET Core', 'ASP.NET', 'C# (7 years)', 'T-SQL (13 years)', '.NET Core (6 years)']);

function isHighlight(skill) {
  return highlightSkills.has(skill) || highlightSkills.has(skill.replace(/\s*\(.*?\)/, ''));
}

// ── Build HTML ──

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Address parts
const addressParts = address.split(',').map(s => s.trim());

// Format email for display (break long email)
const emailDisplay = email.length > 24
  ? email.replace('@', '<br>@')
  : email;

// Build contact section
let contactHtml = '';
if (address) {
  contactHtml += `      <div class="contact-item">\n        ${icons.location}\n        <span>${addressParts.join('<br>')}</span>\n      </div>\n`;
}
if (phone) {
  contactHtml += `      <div class="contact-item">\n        ${icons.phone}\n        <span>${esc(phone)}</span>\n      </div>\n`;
}
if (email) {
  contactHtml += `      <div class="contact-item">\n        ${icons.email}\n        <a href="mailto:${esc(email)}">${emailDisplay}</a>\n      </div>\n`;
}
if (linkedin) {
  contactHtml += `      <div class="contact-item">\n        ${icons.linkedin}\n        <a href="${esc(linkedin)}">LinkedIn Profile</a>\n      </div>\n`;
}
if (github) {
  contactHtml += `      <div class="contact-item">\n        ${icons.github}\n        <a href="${esc(github)}">${esc(githubDisplay)}</a>\n      </div>\n`;
}

// Build skills section
let skillsHtml = skills.map(cat => {
  const tags = cat.items.map(item => {
    const cls = isHighlight(item) ? 'skill-tag highlight' : 'skill-tag';
    // Strip year info for display in tags
    const display = item.replace(/\s*\(\d+ years?\)/, '');
    return `          <span class="${cls}">${esc(display)}</span>`;
  }).join('\n');
  return `      <div class="skill-category">
        <div class="skill-category-name">${esc(cat.category.replace(/\s*&\s*/, ' &amp; '))}</div>
        <div class="skill-tags">
${tags}
        </div>
      </div>`;
}).join('\n\n');

// Build education section
let educationHtml = education.map(ed => {
  const parts = ed.school.split('|').map(s => s.trim());
  const school = parts[0] || '';
  const dateAndLocation = parts.slice(1).join(', ');
  return `      <div class="education-entry">
        <div class="ed-title">${esc(ed.title)}</div>
        <div class="ed-school">${esc(school)}${dateAndLocation ? '<br>' + esc(dateAndLocation) : ''}</div>
      </div>`;
}).join('\n');

// Build experience section
// Determine which jobs are "minor" (no bullets and no description)
let experienceHtml = jobs.map(job => {
  const isMinor = job.bullets.length === 0 && !job.desc;

  if (isMinor) {
    return `      <div class="job-minor">
        <div><span class="job-title">${esc(job.title)}</span><span class="job-company">${esc(job.company)}</span></div>
        <span class="job-date">${esc(job.date)}</span>
      </div>`;
  }

  let html = `      <div class="job">
        <div class="job-header">
          <span class="job-title">${esc(job.title)}</span>
          <span class="job-date">${esc(job.date)}</span>
        </div>
        <div class="job-company">${esc(job.company)} <span class="job-location">&middot; ${esc(job.location)}</span></div>`;

  if (job.desc) {
    html += `\n        <p class="job-desc">${esc(job.desc)}</p>`;
  }

  if (job.bullets.length > 0) {
    html += `\n        <ul class="job-bullets">\n`;
    html += job.bullets.map(b => `          <li>${esc(b)}</li>`).join('\n');
    html += `\n        </ul>`;
  }

  html += `\n      </div>`;
  return html;
}).join('\n\n');

// ── Assemble full HTML ──

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(name)} - ${esc(role)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --ink: #1a1d23;
    --ink-soft: #4a4e59;
    --ink-muted: #7b7f8e;
    --accent: #2d5a7b;
    --accent-light: #e8f0f6;
    --surface: #ffffff;
    --rule: #d4d8e0;
    --rule-light: #eceef2;
    --sidebar-bg: #f5f6f8;
    --font-display: 'Cormorant Garamond', Georgia, serif;
    --font-body: 'Outfit', -apple-system, sans-serif;
  }

  @page {
    size: A4;
    margin: 0;
  }

  html { font-size: 15px; }

  body {
    font-family: var(--font-body);
    color: var(--ink);
    background: #e8e8e8;
    line-height: 1.55;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
  }

  .page {
    width: 210mm;
    height: 297mm;
    margin: 20px auto;
    background: var(--surface);
    display: grid;
    grid-template-columns: 200px 1fr;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--sidebar-bg);
    padding: 32px 20px 20px;
    border-right: 1px solid var(--rule-light);
  }

  .sidebar-section { margin-bottom: 18px; }

  .sidebar-heading {
    font-family: var(--font-body);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: var(--accent);
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid var(--accent);
  }

  .contact-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 0.72rem;
    color: var(--ink-soft);
    line-height: 1.4;
    word-break: break-word;
  }

  .contact-item svg {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    margin-top: 1px;
    color: var(--accent);
  }

  .contact-item a {
    color: var(--ink-soft);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }

  .contact-item a:hover { border-bottom-color: var(--accent); }

  .skill-category { margin-bottom: 10px; }

  .skill-category-name {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 4px;
  }

  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .skill-tag {
    font-size: 0.62rem;
    color: var(--ink-soft);
    background: var(--surface);
    border: 1px solid var(--rule);
    padding: 2px 7px;
    border-radius: 3px;
    line-height: 1.5;
  }

  .skill-tag.highlight {
    background: var(--accent-light);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 500;
  }

  .education-entry { margin-bottom: 8px; }

  .education-entry .ed-title {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.3;
  }

  .education-entry .ed-school {
    font-size: 0.65rem;
    color: var(--ink-muted);
    margin-top: 1px;
  }

  /* ── Main Content ── */
  .main {
    padding: 32px 32px 20px 28px;
  }

  .header { margin-bottom: 16px; }

  .name {
    font-family: var(--font-display);
    font-size: 2.3rem;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
    letter-spacing: -0.5px;
  }

  .title-role {
    font-family: var(--font-body);
    font-size: 0.88rem;
    font-weight: 300;
    color: var(--accent);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-top: 6px;
  }

  .header-rule {
    width: 48px;
    height: 2.5px;
    background: var(--accent);
    margin-top: 14px;
    border: none;
  }

  .profile {
    font-size: 0.78rem;
    color: var(--ink-soft);
    line-height: 1.55;
    margin-bottom: 14px;
    max-width: 520px;
  }

  .section { margin-bottom: 10px; }

  .section-heading {
    font-family: var(--font-body);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: var(--accent);
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid var(--accent);
  }

  .job { margin-bottom: 11px; }
  .job:last-child { margin-bottom: 0; }

  .job-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
  }

  .job-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink);
  }

  .job-date {
    font-size: 0.68rem;
    color: var(--ink-muted);
    font-weight: 400;
    white-space: nowrap;
  }

  .job-company {
    font-size: 0.72rem;
    color: var(--accent);
    font-weight: 500;
    margin-top: 1px;
  }

  .job-location {
    font-size: 0.68rem;
    color: var(--ink-muted);
    font-weight: 300;
  }

  .job-desc {
    font-size: 0.72rem;
    color: var(--ink-soft);
    margin-top: 4px;
    font-style: italic;
    line-height: 1.5;
  }

  .job-bullets {
    list-style: none;
    margin-top: 5px;
    padding: 0;
  }

  .job-bullets li {
    font-size: 0.72rem;
    color: var(--ink-soft);
    line-height: 1.55;
    padding-left: 14px;
    position: relative;
    margin-bottom: 2px;
  }

  .job-bullets li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
  }

  .job-minor {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 0;
  }

  .job-minor .job-title { font-weight: 500; font-size: 0.74rem; }
  .job-minor .job-company { display: inline; margin-left: 6px; font-size: 0.68rem; }

  /* ── Print Styles ── */
  @media print {
    html { font-size: 15px; }
    body { background: none; }
    .page {
      margin: 0;
      box-shadow: none;
      width: 100%;
      height: 100vh;
    }
  }
</style>
</head>
<body>

<div class="page">
  <!-- ── Sidebar ── -->
  <aside class="sidebar">

    <div class="sidebar-section">
      <div class="sidebar-heading">Contact</div>
${contactHtml}    </div>

    <div class="sidebar-section">
      <div class="sidebar-heading">Skills</div>

${skillsHtml}
    </div>

    <div class="sidebar-section">
      <div class="sidebar-heading">Education</div>

${educationHtml}
    </div>

  </aside>

  <!-- ── Main Content ── -->
  <main class="main">

    <header class="header">
      <div class="name">${esc(name)}</div>
      <div class="title-role">${esc(role)}</div>
      <hr class="header-rule">
    </header>

    <p class="profile">
      ${esc(profile)}
    </p>

    <section class="section">
      <div class="section-heading">Experience</div>

${experienceHtml}

    </section>

  </main>
</div>

</body>
</html>
`;

writeFileSync(htmlPath, html, 'utf-8');
console.log('Generated:', htmlPath);

// ── Generate PDF ──

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
  args: ['--no-sandbox']
});

const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 15000 });

await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' }
});

await browser.close();
console.log('Generated:', pdfPath);
