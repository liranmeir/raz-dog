// Regenerates docs/architecture-logos.svg — the box diagram with real brand
// logos for the raz-dog app.
//
// Not part of the app's dependencies; run from a scratch directory:
//   mkdir /tmp/gen-logos && cd /tmp/gen-logos && npm install simple-icons
//   cp /path/to/repo/docs/gen-architecture-logos.js . && node gen-architecture-logos.js
//   cp architecture-logos.svg /path/to/repo/docs/
//
// Boxes are drawn before edges so edge labels are never hidden under a box.
const path = require('path');
const icons = require('simple-icons');

function iconG(key, x, y, size, color) {
  const i = icons[key];
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})"><path d="${i.path}" fill="${color || '#' + i.hex}"/></g>`;
}

function micIcon(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round">
    <rect x="8" y="2" width="8" height="13" rx="4"/>
    <path d="M4.5 11a7.5 7.5 0 0 0 15 0"/>
    <line x1="12" y1="18.5" x2="12" y2="22"/>
  </g>`;
}

function storageIcon(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.7">
    <ellipse cx="12" cy="5" rx="8" ry="3"/>
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>
  </g>`;
}

function lockIcon(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.8">
    <rect x="4" y="10" width="16" height="12" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
  </g>`;
}

const INK = '#1e293b';
const MUTED = '#64748b';
const BOX_FILL = '#f8fafc';
const BOX_STROKE = '#cbd5e1';
const FONT = 'ui-sans-serif,system-ui,sans-serif';

/** icons: array of svg snippets laid out in a row at the top of the box */
function box(x, y, w, h, label, iconFns, sublabel) {
  const cx = x + w / 2;
  const size = 32;
  const gap = 14;
  const total = iconFns.length * size + (iconFns.length - 1) * gap;
  const startX = cx - total / 2;
  const iconsSvg = iconFns.map((fn, i) => fn(startX + i * (size + gap), y + 14, size)).join('');
  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${BOX_FILL}" stroke="${BOX_STROKE}" stroke-width="1.5"/>
    ${iconsSvg}
    <text x="${cx}" y="${y + h - (sublabel ? 32 : 16)}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="${INK}">${label}</text>
    ${sublabel ? `<text x="${cx}" y="${y + h - 13}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${MUTED}">${sublabel}</text>` : ''}
  </g>`;
}

function edge(x1, y1, x2, y2, label, bidir, dy = -8) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + dy;
  return `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${MUTED}" stroke-width="1.5"
    marker-end="url(#arrow)" ${bidir ? 'marker-start="url(#arrow-start)"' : ''}/>
  <rect x="${midX - label.replace(/&amp;/g, '&').length * 3.2 - 6}" y="${midY - 12}" width="${label.replace(/&amp;/g, '&').length * 6.4 + 12}" height="18" rx="4" fill="white" opacity="0.95"/>
  <text x="${midX}" y="${midY}" text-anchor="middle" font-family="${FONT}" font-size="12.5" fill="${INK}">${label}</text>`;
}

const W = 1480;
const H = 470;

const I = (key, color) => (x, y, s) => iconG(key, x, y, s, color);

const boxes = [
  // the device
  box(30, 170, 210, 130, 'iPad / tablet', [I('siApple', '#000'), I('siSafari')], 'home-screen PWA'),
  // client-side app
  box(320, 30, 300, 120, 'Game UI', [I('siReact'), I('siFramer', '#0055ff')], 'React · Framer Motion · games &amp; shop'),
  box(320, 180, 300, 120, '3D puppy', [I('siThreedotjs', '#000')], 'React Three Fiber · built in code'),
  box(320, 330, 300, 110, 'Voice echo + device cache', [(x, y, s) => micIcon(x, y, s, INK), (x, y, s) => storageIcon(x, y, s, INK)], 'Web Audio · localStorage (offline-first)'),
  // server
  box(820, 150, 280, 160, 'Next.js app', [I('siNextdotjs', '#000'), I('siVercel', '#000'), (x, y, s) => lockIcon(x, y, s, INK)], 'Server Actions · /parent password gate'),
  // data + delivery
  box(1180, 40, 270, 130, 'Neon Postgres', [I('siNeon', '#00e599'), I('siPrisma', '#2D3748')], 'Player · Settings · GameEvent'),
  box(1180, 300, 270, 130, 'GitHub → Vercel', [I('siGithub', '#181717'), I('siVercel', '#000')], 'push to main = tested build + deploy'),
];

const edges = [
  edge(240, 210, 320, 100, 'plays', false),
  edge(470, 150, 470, 180, '', false),
  edge(240, 260, 320, 385, 'mic / speaker', true, 6),
  edge(620, 100, 820, 210, 'sync progress, load settings', true, -16),
  edge(1100, 190, 1180, 120, 'Prisma', true),
  edge(1180, 365, 1100, 280, 'build &amp; deploy', false, 10),
];

// label for the short vertical UI → 3D link
const innerLabel = `<rect x="482" y="157" width="128" height="18" rx="4" fill="white" opacity="0.95"/>
  <text x="546" y="170" text-anchor="middle" font-family="${FONT}" font-size="12.5" fill="${INK}">mood · voice level</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${MUTED}"/></marker>
    <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6 Z" fill="${MUTED}"/></marker>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
  <text x="470" y="${H - 8}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${MUTED}">runs in the browser</text>
  <text x="960" y="${H - 8}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${MUTED}">raz-dog.liranmeir.com</text>
  ${boxes.join('\n')}
  ${edges.join('\n')}
  ${innerLabel}
</svg>`;

const outPath = path.join(process.cwd(), 'architecture-logos.svg');
require('fs').writeFileSync(outPath, svg);
console.log('wrote ' + outPath);
