// The night beyond the picture. The sky image only covers the right side of a wide
// window; this carries its stars across the rest, in the same two kinds the image has:
// a fine dust of cool white points, and a few warm four-pointed sparkles. A handful of
// them breathe slowly. Stars thin out where the image fades in, so its own stars take
// over instead of doubling up. Nothing runs on a phone, where the image fills the screen.
(() => {
  const canvas = document.createElement("canvas");
  canvas.className = "stars";
  canvas.setAttribute("aria-hidden", "true");
  const sky = document.querySelector(".sky");
  if (!sky) return;
  sky.before(canvas);

  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const phone = matchMedia("(max-width: 40rem)");
  const base = document.createElement("canvas");
  let twinklers = [];
  let frame = 0;
  let width = 0;
  let height = 0;

  // Same stars on every visit: a fixed seed, not Math.random.
  function random(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // How much of the sky image shows at x; mirrors the mask in style.css.
  function imageCover(x) {
    const rect = sky.getBoundingClientRect();
    const p = (x - rect.left) / rect.width;
    const stops = [[0, 0], [0.18, 0.2], [0.4, 0.6], [0.72, 1]];
    if (p <= 0) return 0;
    for (let i = 1; i < stops.length; i++) {
      const [p1, a1] = stops[i];
      const [p0, a0] = stops[i - 1];
      if (p <= p1) return a0 + ((p - p0) / (p1 - p0)) * (a1 - a0);
    }
    return 1;
  }

  function dot(g, x, y, r, color, alpha) {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // A warm point with a soft halo and two thin rays, like the sparkles in the image.
  function sparkle(g, x, y, size, alpha) {
    g.save();
    g.globalAlpha = alpha;
    const halo = g.createRadialGradient(x, y, 0, x, y, size * 2.2);
    halo.addColorStop(0, "rgba(255, 226, 178, 0.55)");
    halo.addColorStop(1, "rgba(255, 226, 178, 0)");
    g.fillStyle = halo;
    g.beginPath();
    g.arc(x, y, size * 2.2, 0, Math.PI * 2);
    g.fill();
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const ray = g.createLinearGradient(x - dx * size * 3, y - dy * size * 3, x + dx * size * 3, y + dy * size * 3);
      ray.addColorStop(0, "rgba(255, 232, 196, 0)");
      ray.addColorStop(0.5, "rgba(255, 238, 210, 0.9)");
      ray.addColorStop(1, "rgba(255, 232, 196, 0)");
      g.strokeStyle = ray;
      g.lineWidth = Math.max(0.6, size * 0.28);
      g.beginPath();
      g.moveTo(x - dx * size * 3, y - dy * size * 3);
      g.lineTo(x + dx * size * 3, y + dy * size * 3);
      g.stroke();
    }
    dot(g, x, y, size * 0.45, "#fff4e2", 1);
    g.restore();
  }

  function layout() {
    cancelAnimationFrame(frame);
    if (phone.matches) { canvas.width = canvas.height = 0; return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    for (const c of [canvas, base]) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const g = base.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = random(20260925);
    twinklers = [];

    // Dust: sparse enough to stay a background, about one star per 7000 px².
    const dust = Math.round((width * height) / 7000);
    for (let i = 0; i < dust; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const fade = 1 - imageCover(x);
      if (fade <= 0.02) continue;
      const r = 0.35 + rand() ** 3 * 0.9;
      const cool = rand() < 0.82;
      const color = cool ? "#e4e9ff" : "#ffe3bd";
      const alpha = (0.18 + rand() * 0.5) * fade;
      if (rand() < 0.12) {
        twinklers.push({ kind: "dot", x, y, r, color, alpha, speed: 0.4 + rand() * 0.8, phase: rand() * 6.28 });
      } else {
        dot(g, x, y, r, color, alpha);
      }
    }

    // Sparkles: a few, spread so no two crowd each other, all of them breathing.
    const count = Math.max(4, Math.round((width * height) / 260000));
    const placed = [];
    for (let tries = 0; placed.length < count && tries < 200; tries++) {
      const x = 24 + rand() * (width - 48);
      const y = 24 + rand() * (height - 48);
      const fade = 1 - imageCover(x);
      if (fade < 0.5) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 220)) continue;
      const size = 1.6 + rand() * 1.8;
      placed.push({ x, y });
      twinklers.push({ kind: "sparkle", x, y, size, alpha: (0.55 + rand() * 0.35) * fade, speed: 0.25 + rand() * 0.35, phase: rand() * 6.28 });
    }

    draw(performance.now());
    if (!still.matches) frame = requestAnimationFrame(tick);
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.drawImage(base, 0, 0, width, height);
    const t = now / 1000;
    for (const s of twinklers) {
      // Never goes dark: breathes between about half and full brightness.
      const breath = still.matches ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      if (s.kind === "sparkle") sparkle(ctx, s.x, s.y, s.size, s.alpha * breath);
      else dot(ctx, s.x, s.y, s.r, s.color, s.alpha * breath);
    }
  }

  // Twenty frames a second is plenty for something this slow, and it spares the battery.
  let last = 0;
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (document.hidden || now - last < 50) return;
    last = now;
    draw(now);
  }

  let pending = 0;
  addEventListener("resize", () => {
    clearTimeout(pending);
    pending = setTimeout(layout, 150);
  });
  still.addEventListener("change", layout);
  phone.addEventListener("change", layout);
  layout();
})();
