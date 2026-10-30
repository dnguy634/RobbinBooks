// ── LINKS ──
document.querySelectorAll('[data-link="join"]').forEach(a => (a.href = SITE.joinUrl));
document.getElementById('year').textContent = new Date().getFullYear();

const escapeHtml = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.getElementById('pikkitLinks').innerHTML = SITE.pikkit
  .map(p => `<a class="btn btn-ghost btn-sm" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}'s Pikkit ↗</a>`)
  .join('');

// ── STATS ──
document.getElementById('stats').innerHTML = SITE.stats
  .map(s => `<div class="stat"><span class="stat-value mono">${escapeHtml(s.value)}</span><span class="stat-label">${escapeHtml(s.label)}</span></div>`)
  .join('');

// ── FOUNDERS ──
document.getElementById('founderList').innerHTML = FOUNDERS.map(f => {
  const pikkit = SITE.pikkit.find(p => p.name === f.name);
  const avatar = f.photo
    ? `<img class="founder-avatar" src="${escapeHtml(f.photo)}" alt="${escapeHtml(f.name)}" />`
    : `<span class="founder-avatar">${escapeHtml(f.name.charAt(0))}</span>`;
  return `
    <div class="card founder">
      ${avatar}
      <h3>${escapeHtml(f.name)}</h3>
      <p class="founder-role">${escapeHtml(f.role)}</p>
      ${f.bio ? `<p class="founder-bio">${escapeHtml(f.bio)}</p>` : ''}
      ${pikkit ? `<a class="founder-link" href="${escapeHtml(pikkit.url)}" target="_blank" rel="noopener">View Pikkit ↗</a>` : ''}
    </div>`;
}).join('');

// ── SCREENSHOTS ──
const gallery = document.getElementById('gallery');
if (SCREENSHOTS.length) {
  gallery.innerHTML = SCREENSHOTS.map(
    (s, i) => `
      <figure class="shot" data-index="${i}">
        <img src="${escapeHtml(s.src)}" alt="${escapeHtml(s.caption || 'RobbinBooks result')}" loading="lazy" />
        ${s.caption ? `<figcaption>${escapeHtml(s.caption)}</figcaption>` : ''}
      </figure>`
  ).join('');
} else {
  gallery.innerHTML = [1, 2, 3]
    .map(() => `<div class="placeholder"><span>Screenshot</span><small>Add images in data.js</small></div>`)
    .join('');
}

const lightbox = document.getElementById('lightbox');
gallery.addEventListener('click', e => {
  const fig = e.target.closest('.shot');
  if (!fig) return;
  const s = SCREENSHOTS[fig.dataset.index];
  document.getElementById('lightboxImg').src = s.src;
  document.getElementById('lightboxCaption').textContent = s.caption || '';
  lightbox.hidden = false;
});
lightbox.addEventListener('click', e => {
  if (e.target.id !== 'lightboxImg') lightbox.hidden = true;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') lightbox.hidden = true;
});

// ── TESTIMONIALS ──
const testimonialList = document.getElementById('testimonialList');
const quoteCount = TESTIMONIALS.length;
// Rotate only when there are more quotes than fit in one row on desktop.
const rotating = quoteCount > 3;

if (quoteCount) {
  const cards = TESTIMONIALS.map(
    t => `
      <blockquote class="quote">
        <p>“${escapeHtml(t.text)}”</p>
        <footer>
          <span class="quote-name">${escapeHtml(t.name)}</span>
          ${t.result ? `<span class="quote-result mono">${escapeHtml(t.result)}</span>` : ''}
        </footer>
      </blockquote>`
  ).join('');
  // A second copy follows the first so the loop never shows an empty gap.
  testimonialList.innerHTML = rotating ? cards + cards : cards;
} else {
  testimonialList.innerHTML = [1, 2, 3]
    .map(() => `<div class="placeholder"><span>Testimonial</span><small>Add member quotes in data.js</small></div>`)
    .join('');
}

// ── TESTIMONIAL CAROUSEL ──
// Slides one card at a time. After passing the last real card, it jumps back
// to the matching card in the first copy with no animation, so the loop is seamless.
let quoteIndex = 0;
let rotateTimer = null;
let paused = false;

function moveTo(i, animate = true) {
  quoteIndex = i;
  const step = testimonialList.children[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(testimonialList).gap) || 0);
  testimonialList.style.transition = animate ? '' : 'none';
  testimonialList.style.transform = `translateX(${-i * step}px)`;
  if (!animate) testimonialList.offsetWidth; // apply the jump before the next animated move
}

function nextQuote() {
  if (quoteIndex >= quoteCount) moveTo(quoteIndex - quoteCount, false);
  moveTo(quoteIndex + 1);
}

function prevQuote() {
  if (quoteIndex <= 0) moveTo(quoteIndex + quoteCount, false);
  moveTo(quoteIndex - 1);
}

function restartRotation() {
  clearInterval(rotateTimer);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  rotateTimer = setInterval(() => {
    if (!paused && !document.hidden) nextQuote();
  }, 4000);
}

if (rotating) {
  const carousel = document.getElementById('carousel');
  carousel.classList.remove('is-static');
  document.getElementById('carouselControls').hidden = false;

  testimonialList.addEventListener('transitionend', () => {
    if (quoteIndex >= quoteCount) moveTo(quoteIndex - quoteCount, false);
  });
  document.getElementById('nextQuote').addEventListener('click', () => { nextQuote(); restartRotation(); });
  document.getElementById('prevQuote').addEventListener('click', () => { prevQuote(); restartRotation(); });
  carousel.addEventListener('mouseenter', () => (paused = true));
  carousel.addEventListener('mouseleave', () => (paused = false));
  window.addEventListener('resize', () => moveTo(quoteIndex, false));
  restartRotation();
}

// ── +EV MATH ──
// American odds → decimal payout (stake included). Returns null for invalid input.
function toDecimal(american) {
  const n = parseFloat(String(american).replace(/\s/g, ''));
  if (!isFinite(n) || Math.abs(n) < 100) return null;
  return n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
}

const pct = x => (x * 100).toFixed(1) + '%';
const money = x => (x >= 0 ? '+$' : '−$') + Math.abs(x).toFixed(2);

const inputs = ['bookOdds', 'fairOdds', 'stake'].map(id => document.getElementById(id));
let current = null;

function calculate() {
  const bookDec = toDecimal(inputs[0].value);
  const fairDec = toDecimal(inputs[1].value);
  const stake = parseFloat(inputs[2].value) || 0;
  const verdict = document.getElementById('verdict');
  const out = id => document.getElementById(id);

  if (!bookDec || !fairDec) {
    verdict.className = 'verdict';
    verdict.textContent = 'Enter American odds like +150 or -110';
    ['outImplied', 'outFair', 'outEdge', 'outEv'].forEach(id => (out(id).textContent = '—'));
    current = null;
    drawSim();
    return;
  }

  const p = 1 / fairDec;
  const edge = p * bookDec - 1;
  const ev = edge * stake;

  out('outImplied').textContent = pct(1 / bookDec);
  out('outFair').textContent = pct(p);
  out('outEdge').textContent = (edge >= 0 ? '+' : '') + pct(edge);
  out('outEv').textContent = money(ev);
  out('outEdge').className = out('outEv').className = edge >= 0 ? 'pos' : 'neg';

  verdict.className = 'verdict ' + (edge > 0 ? 'is-pos' : 'is-neg');
  verdict.textContent = edge > 0 ? '+EV: this bet is priced in your favor' : 'No edge: the book has the advantage';

  current = { p, bookDec, stake };
  drawSim();
}

// ── SIMULATION ──
const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d');
const BETS = 500;
const RUNS = 5;
let paths = [];

function simulate() {
  if (!current) return (paths = []);
  const { p, bookDec, stake } = current;
  paths = Array.from({ length: RUNS }, () => {
    let bank = 0;
    const path = [0];
    for (let i = 0; i < BETS; i++) {
      bank += Math.random() < p ? stake * (bookDec - 1) : -stake;
      path.push(bank);
    }
    return path;
  });
}

function drawSim() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!current) return;
  if (!paths.length) simulate();

  const { p, bookDec, stake } = current;
  const evPerBet = (p * bookDec - 1) * stake;
  const all = paths.flat().concat([0, evPerBet * BETS]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = 8;
  const x = i => pad + (i / BETS) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);

  // zero line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y(0));
  ctx.lineTo(w - pad, y(0));
  ctx.stroke();

  const colors = ['#4ade80', '#38bdf8', '#a78bfa', '#fbbf24', '#f472b6'];
  paths.forEach((path, r) => {
    ctx.strokeStyle = colors[r % colors.length];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    path.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // expected value line
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x(0), y(0));
  ctx.lineTo(x(BETS), y(evPerBet * BETS));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`Expected after ${BETS} bets: ${money(evPerBet * BETS)}`, pad + 4, pad + 12);
}

inputs.forEach(el =>
  el.addEventListener('input', () => {
    paths = [];
    calculate();
  })
);
document.getElementById('rerun').addEventListener('click', () => {
  paths = [];
  drawSim();
});
window.addEventListener('resize', drawSim);
calculate();
