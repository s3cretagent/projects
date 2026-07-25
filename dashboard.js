/* =========================================================
   Shared dashboard engine — dependency-free SVG charts,
   live-data simulation, theme + reveal.
   ========================================================= */
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  const tt = document.getElementById('themeToggle');
  if (tt) tt.addEventListener('click', () => {
    const light = document.documentElement.classList.toggle('light');
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) {}
  });
  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

  /* ---------- reveal on scroll (both directions) ---------- */
  const rev = document.querySelectorAll('.reveal');
  if (rev.length && 'IntersectionObserver' in window && !prefersReduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)),
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    rev.forEach((el) => io.observe(el));
  } else { rev.forEach((el) => el.classList.add('in')); }

  /* ---------- helpers ---------- */
  const S = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = {
    int: (n) => Math.round(n).toLocaleString(),
    k: (n) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'K' : Math.round(n).toString()),
    big: (n) => { const a = Math.abs(n); return a >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toString(); },
    usd: (n) => '$' + Math.round(n).toLocaleString(),
    usdk: (n) => '$' + (n / 1000).toFixed(1) + 'K',
    pct: (n) => n.toFixed(2) + '%',
    ms: (n) => n.toFixed(0) + 'ms',
  };

  function ticks(min, max, count) {
    const span = max - min || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
    const start = Math.floor(min / step) * step;
    const out = [];
    for (let v = start; v <= max + step * 0.001; v += step) out.push(v);
    return out;
  }

  /* ---------- LINE / AREA chart with crosshair ---------- */
  // opts: { labels:[], series:[{name,color,data:[]}], yfmt, area, min, max }
  function lineChart(host, opts) {
    const wrap = document.createElement('div'); wrap.className = 'chart-wrap';
    const tip = document.createElement('div'); tip.className = 'tip';
    host.appendChild(wrap); wrap.appendChild(tip);
    let W = 0, H = 240; const pad = { l: 48, r: 14, t: 12, b: 26 };
    let state = opts;

    function draw() {
      W = wrap.clientWidth || 600;
      wrap.querySelector('svg') && wrap.querySelector('svg').remove();
      const svg = S('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
      const { labels, series } = state;
      const n = labels.length;
      let lo = state.min != null ? state.min : Infinity, hi = state.max != null ? state.max : -Infinity;
      if (state.min == null || state.max == null) series.forEach((s) => s.data.forEach((v) => { if (v < lo) lo = v; if (v > hi) hi = v; }));
      if (lo === hi) { hi = lo + 1; }
      if (state.min == null) lo = Math.min(lo, lo - (hi - lo) * 0.08);
      const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
      const X = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
      const Y = (v) => pad.t + plotH - ((v - lo) / (hi - lo)) * plotH;

      // grid + y ticks
      ticks(lo, hi, 4).forEach((tv) => {
        if (tv < lo - 1e-9 || tv > hi + 1e-9) return;
        const y = Y(tv);
        svg.appendChild(S('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: css('--grid'), 'stroke-width': 1 }));
        const tl = S('text', { x: pad.l - 8, y: y + 4, fill: css('--muted'), 'font-size': 11, 'text-anchor': 'end' });
        tl.textContent = (state.yfmt || fmt.int)(tv); svg.appendChild(tl);
      });
      // x labels (thin subset)
      const stepL = Math.ceil(n / 6);
      labels.forEach((lb, i) => { if (i % stepL !== 0 && i !== n - 1) return;
        const t = S('text', { x: X(i), y: H - 8, fill: css('--muted'), 'font-size': 11, 'text-anchor': 'middle' }); t.textContent = lb; svg.appendChild(t); });

      // series
      series.forEach((s) => {
        const pts = s.data.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
        if (state.area) {
          const ap = `${X(0)},${Y(lo)} ` + s.data.map((v, i) => `${X(i)},${Y(v)}`).join(' ') + ` ${X(n - 1)},${Y(lo)}`;
          const gid = 'g' + Math.abs(hash(s.name));
          const defs = S('defs', {}); const lg = S('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
          lg.appendChild(S('stop', { offset: '0%', 'stop-color': s.color, 'stop-opacity': 0.28 }));
          lg.appendChild(S('stop', { offset: '100%', 'stop-color': s.color, 'stop-opacity': 0 }));
          defs.appendChild(lg); svg.appendChild(defs);
          svg.appendChild(S('polygon', { points: ap, fill: `url(#${gid})` }));
        }
        svg.appendChild(S('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      });

      // crosshair + hover
      const cross = S('line', { x1: 0, y1: pad.t, x2: 0, y2: pad.t + plotH, stroke: css('--axis'), 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 });
      svg.appendChild(cross);
      const dots = series.map((s) => { const c = S('circle', { r: 4, fill: s.color, stroke: css('--bg-soft'), 'stroke-width': 2, opacity: 0 }); svg.appendChild(c); return c; });
      const hit = S('rect', { x: pad.l, y: pad.t, width: plotW, height: plotH, fill: 'transparent' });
      svg.appendChild(hit);
      const move = (ev) => {
        const r = svg.getBoundingClientRect();
        const relX = (ev.clientX - r.left) * (W / r.width);
        let i = Math.round(((relX - pad.l) / plotW) * (n - 1)); i = Math.max(0, Math.min(n - 1, i));
        cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('opacity', 1);
        let rows = '';
        series.forEach((s, si) => { dots[si].setAttribute('cx', X(i)); dots[si].setAttribute('cy', Y(s.data[i])); dots[si].setAttribute('opacity', 1);
          rows += `<div style="display:flex;gap:8px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:${s.color};display:inline-block"></i>${s.name}: <b>${(state.yfmt || fmt.int)(s.data[i])}</b></div>`; });
        tip.innerHTML = `<div style="color:var(--muted);margin-bottom:3px">${labels[i]}</div>${rows}`;
        tip.style.left = (X(i) / W * 100) + '%'; tip.style.top = (Y(series[0].data[i]) / H * 100) + '%'; tip.style.opacity = 1;
      };
      hit.addEventListener('mousemove', move);
      hit.addEventListener('mouseleave', () => { tip.style.opacity = 0; cross.setAttribute('opacity', 0); dots.forEach((d) => d.setAttribute('opacity', 0)); });
      wrap.appendChild(svg);
    }
    draw();
    window.addEventListener('resize', draw);
    return { update(next) { state = Object.assign(state, next); draw(); }, get state() { return state; } };
  }

  /* ---------- BAR chart ---------- */
  function barChart(host, opts) {
    const wrap = document.createElement('div'); wrap.className = 'chart-wrap';
    const tip = document.createElement('div'); tip.className = 'tip'; host.appendChild(wrap); wrap.appendChild(tip);
    const H = 240; const pad = { l: 48, r: 14, t: 12, b: 30 };
    let state = opts;
    function draw() {
      const W = wrap.clientWidth || 600;
      wrap.querySelector('svg') && wrap.querySelector('svg').remove();
      const svg = S('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
      const data = state.data; const hi = state.max || Math.max(...data.map((d) => d.value)) * 1.1;
      const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
      const Y = (v) => pad.t + plotH - (v / hi) * plotH;
      ticks(0, hi, 4).forEach((tv) => { const y = Y(tv);
        svg.appendChild(S('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: css('--grid'), 'stroke-width': 1 }));
        const t = S('text', { x: pad.l - 8, y: y + 4, fill: css('--muted'), 'font-size': 11, 'text-anchor': 'end' }); t.textContent = (state.yfmt || fmt.int)(tv); svg.appendChild(t); });
      const bw = plotW / data.length * 0.6; const gap = plotW / data.length;
      data.forEach((d, i) => {
        const x = pad.l + gap * i + (gap - bw) / 2; const y = Y(d.value); const h = pad.t + plotH - y;
        const rect = S('rect', { x, y, width: bw, height: Math.max(1, h), rx: 4, fill: d.color || css('--s1') });
        rect.style.transition = 'opacity .15s'; rect.addEventListener('mouseenter', () => { rect.setAttribute('opacity', 0.8);
          tip.innerHTML = `<div style="color:var(--muted);margin-bottom:2px">${d.label}</div><b>${(state.yfmt || fmt.int)(d.value)}</b>`;
          tip.style.left = (x + bw / 2) / W * 100 + '%'; tip.style.top = y / H * 100 + '%'; tip.style.opacity = 1; });
        rect.addEventListener('mouseleave', () => { rect.setAttribute('opacity', 1); tip.style.opacity = 0; });
        svg.appendChild(rect);
        const t = S('text', { x: x + bw / 2, y: H - 10, fill: css('--muted'), 'font-size': 11, 'text-anchor': 'middle' }); t.textContent = d.label; svg.appendChild(t);
      });
      wrap.appendChild(svg);
    }
    draw(); window.addEventListener('resize', draw);
    return { update(next) { state = Object.assign(state, next); draw(); } };
  }

  /* ---------- DONUT ---------- */
  function donut(host, segments, centerLabel) {
    const wrap = document.createElement('div'); wrap.className = 'chart-wrap'; host.appendChild(wrap);
    const size = 210, r = 78, cx = size / 2, cy = size / 2, sw = 26;
    const svg = S('svg', { viewBox: `0 0 ${size} ${size}`, width: '100%', height: 210 });
    const total = segments.reduce((a, s) => a + s.value, 0);
    let a0 = -Math.PI / 2;
    const tip = document.createElement('div'); tip.className = 'tip'; wrap.appendChild(tip);
    segments.forEach((s) => {
      const a1 = a0 + (s.value / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const p = S('path', { d: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`, fill: 'none', stroke: s.color, 'stroke-width': sw, 'stroke-linecap': 'butt' });
      const mid = (a0 + a1) / 2;
      p.addEventListener('mouseenter', () => { p.setAttribute('stroke-width', sw + 6);
        tip.innerHTML = `<div style="color:var(--muted)">${s.label}</div><b>${fmt.usd(s.value)}</b> · ${(s.value / total * 100).toFixed(1)}%`;
        tip.style.left = (cx + r * 0.7 * Math.cos(mid)) / size * 100 + '%'; tip.style.top = (cy + r * 0.7 * Math.sin(mid)) / size * 100 + '%'; tip.style.opacity = 1; });
      p.addEventListener('mouseleave', () => { p.setAttribute('stroke-width', sw); tip.style.opacity = 0; });
      svg.appendChild(p); a0 = a1;
    });
    const t1 = S('text', { x: cx, y: cy - 2, fill: css('--text'), 'font-size': 22, 'font-weight': 800, 'text-anchor': 'middle' }); t1.textContent = centerLabel.v;
    const t2 = S('text', { x: cx, y: cy + 18, fill: css('--muted'), 'font-size': 12, 'text-anchor': 'middle' }); t2.textContent = centerLabel.l;
    svg.appendChild(t1); svg.appendChild(t2); wrap.appendChild(svg);
  }

  /* ---------- GAUGE (semi) ---------- */
  function gauge(host, value, max, color, label) {
    const size = 160, cx = 80, cy = 92, r = 62, sw = 14;
    const svg = S('svg', { viewBox: `0 0 ${size} 110`, width: '100%', height: 120 });
    const arc = (frac) => { const a0 = Math.PI, a1 = Math.PI + frac * Math.PI;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`; };
    svg.appendChild(S('path', { d: arc(1), fill: 'none', stroke: css('--grid'), 'stroke-width': sw, 'stroke-linecap': 'round' }));
    const val = S('path', { d: arc(Math.max(0.001, Math.min(1, value / max))), fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round' });
    svg.appendChild(val);
    const t = S('text', { x: cx, y: cy - 6, fill: css('--text'), 'font-size': 22, 'font-weight': 800, 'text-anchor': 'middle' }); t.textContent = Math.round(value) + '%';
    const l = S('text', { x: cx, y: cy + 12, fill: css('--muted'), 'font-size': 11, 'text-anchor': 'middle' }); l.textContent = label;
    svg.appendChild(t); svg.appendChild(l); host.appendChild(svg);
    return { set(v) { val.setAttribute('d', arc(Math.max(0.001, Math.min(1, v / max)))); t.textContent = Math.round(v) + '%'; } };
  }

  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0; return h; }

  /* ---------- live helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function drift(v, amt, a, b) { return clamp(v + (Math.random() - 0.5) * amt, a, b); }
  function every(ms, fn) { if (prefersReduced) { fn(); return; } fn(); return setInterval(fn, ms); }
  function countUp(el, to, dur, fmtFn) {
    if (prefersReduced) { el.textContent = fmtFn(to); return; }
    const from = 0; let t0 = null;
    function step(ts) { if (!t0) t0 = ts; const p = Math.min((ts - t0) / dur, 1); el.textContent = fmtFn(lerp(from, to, 1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  window.Dash = { lineChart, barChart, donut, gauge, fmt, drift, every, countUp, css, S, prefersReduced, clamp };
})();
