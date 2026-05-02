// Stats overlay — reads live state from carousel.js globals.
// Depends on: cards, proxies, activeIndex, N, shakeTl, shakeDeadline,
//             currentDurations, ELLIPSE_RX, ELLIPSE_RY, SPREAD,
//             LONG_JUMP_THRESHOLD, LONG_JUMP_SLOW

function updateStats() {
  const el = document.getElementById('ui-stats-body');
  if (!el) return;

  const cardName  = cards[activeIndex]?.querySelector('img')?.alt ?? '—';
  const heroPos   = proxies[activeIndex] ? proxies[activeIndex].pos.toFixed(3) : '—';
  const remaining = Math.max(0, (shakeDeadline - Date.now()) / 1000);
  const shakeVal  = shakeTl
    ? '<span style="color:rgba(255,255,255,0.9)">shaking</span>'
    : `${remaining.toFixed(1)} s`;

  const arcMap = cards.map((_, i) =>
    i === activeIndex
      ? '<span style="color:rgba(255,255,255,0.9)">◉</span>'
      : '<span style="color:rgba(255,255,255,0.25)">○</span>'
  ).join(' ');

  const avgPosDiff = proxies.slice(0, -1).reduce((sum, p, i) => sum + (proxies[i + 1].pos - p.pos), 0) / (proxies.length - 1);
  const angles = `${(avgPosDiff * SPREAD * (180 / Math.PI)).toFixed(1)}°`;

  const isLongJump = currentDurations.mult > 1;
  const speedPct   = Math.round(100 / LONG_JUMP_SLOW);
  const jumpVal    = `${LONG_JUMP_THRESHOLD}+ packs → ${speedPct}% speed${isLongJump ? ' <span style="color:rgba(255,255,255,0.9)">active</span>' : ''}`;

  const rows = [
    ['Active Pack',  `${activeIndex} · ${cardName}`],
    ['Pack Count',   `${N}`],
    ['Arc Map',      arcMap],
    ['Arc Pos',      heroPos],
    ['Ellipse',      `RX ${ELLIPSE_RX}  RY ${ELLIPSE_RY}`],
    ['Pack Angles',  angles],
    ['Long Jump',    jumpVal],
    ['Shake In',     shakeVal],
  ];

  const renderCol = items => items.map(([label, value]) =>
    `<div class="stat-row">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>`
  ).join('');

  el.innerHTML =
    `<div class="stats-col">${renderCol(rows.slice(0, 4))}</div>` +
    `<div class="stats-col">${renderCol(rows.slice(4))}</div>`;
}

setInterval(updateStats, 100);
updateStats();
