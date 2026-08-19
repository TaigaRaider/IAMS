// Dependency-free confetti burst. Spawns its own fixed canvas, animates for
// ~2.2s, then removes itself. Call celebrate() from anywhere.
const COLORS = [
  "#0ea5e9",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#eab308",
  "#ec4899",
  "#22d3ee",
];

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function celebrate() {
  if (prefersReducedMotion()) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3000;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * DPR;
  canvas.height = window.innerHeight * DPR;
  ctx.scale(DPR, DPR);
  const W = window.innerWidth;
  const H = window.innerHeight;

  const pieces = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 120,
    y: H * 0.38,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 13 - 4,
    g: 0.32 + Math.random() * 0.14,
    size: 5 + Math.random() * 7,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    shape: Math.random() > 0.5 ? "rect" : "circle",
    life: 1,
  }));

  const start = performance.now();
  const DURATION = 2200;

  const tick = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vx *= 0.992;
      p.life = Math.max(0, 1 - elapsed / DURATION);
      if (p.y > H + 30 || p.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (elapsed < DURATION) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(tick);
}