(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Living tide canvas (always running under the video) ---------- */
  const cv = $('#tide'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, t = 0, running = true;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const sparks = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + .4, p: Math.random() * 6.28 }));
  function draw() {
    const hz = H * (W < 700 ? 0.6 : 0.6);
    // sky: dark slate blue to pale dawn mist
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#16232A'); sky.addColorStop(.45, '#33505D'); sky.addColorStop(.82, '#8FA7B2'); sky.addColorStop(1, '#D9E2E4');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);
    // sun rising (echoes the logo arc)
    const sx = W * 0.5, sy = hz + 6 - Math.sin(t * .00012) * 6, sr = Math.min(W, H) * 0.11;
    const glow = ctx.createRadialGradient(sx, sy, sr * .2, sx, sy, sr * 5);
    glow.addColorStop(0, 'rgba(255,248,240,.85)'); glow.addColorStop(.25, 'rgba(236,236,232,.35)'); glow.addColorStop(1, 'rgba(200,214,220,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, hz);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz); ctx.clip();
    ctx.fillStyle = 'rgba(255,251,246,.95)'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // water base
    const sea = ctx.createLinearGradient(0, hz, 0, H);
    sea.addColorStop(0, '#8EA6B0'); sea.addColorStop(.18, '#4F6D7A'); sea.addColorStop(.6, '#2A4350'); sea.addColorStop(1, '#16232A');
    ctx.fillStyle = sea; ctx.fillRect(0, hz, W, H - hz);
    // sun path shimmer
    for (let i = 0; i < 46; i++) {
      const k = i / 46, y = hz + 4 + Math.pow(k, 1.6) * (H - hz);
      const w = sr * (0.5 + k * 3.2) * (0.75 + 0.25 * Math.sin(t * .002 + i * 1.7));
      const a = (1 - k) * 0.5 * (0.6 + 0.4 * Math.sin(t * .004 + i * 2.3));
      ctx.fillStyle = `rgba(255,250,244,${a})`;
      ctx.fillRect(sx - w / 2 + Math.sin(t * .0015 + i) * 8, y, w, 1.2 + k * 2.5);
    }
    // rolling swell lines (the tide)
    for (let L = 0; L < 18; L++) {
      const k = L / 18, y0 = hz + 8 + Math.pow(k, 1.5) * (H - hz) * 1.02;
      const amp = 2 + k * 16, len = 140 + k * 520, sp = (0.00025 + k * 0.0009) * (L % 2 ? 1 : -0.6);
      ctx.beginPath();
      for (let x = 0; x <= W + 20; x += 14) {
        const y = y0 + Math.sin(x / len * 6.28 + t * sp * 6.28 + L) * amp + Math.sin(x / (len * .37) + t * .0011 + L * 3) * amp * .35;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(226,236,240,${0.08 + (1 - k) * 0.16})`;
      ctx.lineWidth = 0.8 + k * 2.2; ctx.stroke();
    }
    // sparkles
    for (const p of sparks) {
      const y = hz + p.y * (H - hz), dist = Math.abs(p.x * W - sx) / W;
      const a = Math.max(0, Math.sin(t * .003 * p.s + p.p)) * (1 - dist * 1.6) * 0.9;
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(p.x * W + Math.sin(t * .001 + p.p) * 6, y, p.s * 2.2, p.s * .7);
    }
  }
  function loop(ts) { t = ts; if (running) draw(); if (!reduce) requestAnimationFrame(loop); }
  size(); addEventListener('resize', size); draw(); requestAnimationFrame(loop);
  new IntersectionObserver(([e]) => running = e.isIntersecting).observe($('#hero'));

  /* ---------- Real video: fade in when it can play ---------- */
  const v = $('#heroVideo');
  if (v && v.querySelector('source')) {
    const on = () => { v.classList.add('on'); };
    v.addEventListener('playing', on, { once: true });
    v.addEventListener('loadeddata', () => { v.play().catch(() => {}); });
    const tryPlay = () => v.play().then(on).catch(() => {});
    tryPlay();
    // iOS low-power mode: start on first touch
    ['touchstart', 'click', 'scroll'].forEach(ev => addEventListener(ev, tryPlay, { once: true, passive: true }));
  }

  /* ---------- Open / closed (Eastern Time) ---------- */
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const mins = et.getHours() * 60 + et.getMinutes(), open = mins >= 360 && mins < 960;
  let msg;
  if (open) { const left = 960 - mins; msg = left <= 60 ? `Open now · closes in ${left} min` : 'Open now · until 4 PM'; }
  else msg = mins < 360 ? 'Closed · opens 6 AM today' : 'Closed · opens 6 AM tomorrow';
  ['#status', '#status2', '#status3'].forEach(s => { const el = $(s); if (el) el.textContent = msg; });
  ['#dot', '#dot2'].forEach(s => { const el = $(s); if (el) el.classList.toggle('closed', !open); });
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#hours').innerHTML = order.map(d => `<tr class="${d === et.getDay() ? 'today' : ''}"><td>${days[d]}</td><td>6:00 AM – 4:00 PM</td></tr>`).join('');
  $('#yr').textContent = et.getFullYear();

  /* ---------- Syrups ---------- */
  const syr = 'Almond*,Blackberry,Blood Orange,Blueberry,Brown Butter Toffee,Butter Pecan,Caramel*,Cinnamon,Coconut*,Cookie Butter,Cucumber,Dragon Fruit,Grapefruit,Green Apple,Guava,Hazelnut*,Hibiscus,Irish Cream*,Lavender,Lemon,Lime,Lychee,Mango*,Orange,Peppermint,Pistachio,Praline,Passion Fruit,Peach*,Pineapple,Pomegranate*,Raspberry*,Strawberry*,Toasted Marshmallow,Toffee Nut,Vanilla*,Watermelon'.split(',');
  $('#syrups').innerHTML = syr.map(s => s.endsWith('*') ? `<span class="chip">${s.slice(0, -1)} <sup>SF</sup></span>` : `<span class="chip">${s}</span>`).join('');

  /* ---------- Tabs ---------- */
  const tabs = $$('.tab');
  tabs.forEach(tb => tb.addEventListener('click', () => {
    tabs.forEach(x => x.setAttribute('aria-selected', x === tb));
    $$('.panel').forEach(p => p.classList.toggle('on', p.id === tb.getAttribute('aria-controls')));
  }));
  $('.tabs').addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); n.click(); }
  });

  /* ---------- Reviews slider ---------- */
  const track = $('#track'), cards = $$('.rv', track), dots = $('#dots');
  dots.innerHTML = cards.map(() => '<i></i>').join('');
  const di = $$('i', dots);
  const step = () => cards[0].getBoundingClientRect().width + 19;
  const cur = () => Math.round(track.scrollLeft / step());
  const mark = () => { const c = Math.min(cur(), cards.length - 1); di.forEach((d, i) => d.classList.toggle('on', i === c)); };
  track.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true }); mark();
  const go = d => {
    const max = track.scrollWidth - track.clientWidth;
    let x = track.scrollLeft + d * step();
    if (x > max + 4) x = 0; if (x < -4) x = max;
    track.scrollTo({ left: x, behavior: 'smooth' });
  };
  $('#next').onclick = () => go(1); $('#prev').onclick = () => go(-1);
  let auto, hold = false;
  const start = () => { clearInterval(auto); if (!reduce) auto = setInterval(() => { if (!hold) go(1); }, 6000); };
  ['pointerenter', 'touchstart', 'focusin'].forEach(e => track.addEventListener(e, () => hold = true, { passive: true }));
  ['pointerleave', 'touchend', 'focusout'].forEach(e => track.addEventListener(e, () => setTimeout(() => hold = false, 4000), { passive: true }));
  start();

  /* ---------- Header + dock ---------- */
  const top = $('#top'), dock = $('#dock');
  const onScroll = () => {
    const y = scrollY, h = innerHeight * 0.6;
    top.classList.toggle('solid', y > h);
    dock.classList.toggle('show', y > 120);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.rev').forEach(el => io.observe(el));

  /* ---------- Lightbox ---------- */
  const lb = $('#lb'), li = $('#lbimg');
  $$('[data-full]').forEach(b => b.addEventListener('click', () => {
    li.src = b.dataset.full; li.alt = b.dataset.cap || ''; $('#lbcap').textContent = b.dataset.cap || '';
    lb.classList.add('on'); $('#lbx').focus(); document.body.style.overflow = 'hidden';
  }));
  const close = () => { lb.classList.remove('on'); document.body.style.overflow = ''; };
  $('#lbx').onclick = close; lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
