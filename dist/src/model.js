export const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value)));
export function surroundLightness(difference, revealed = false) {
  const amount = clamp(difference, 0, 100);
  return revealed ? [92, 92] : [50 - amount * 0.48, 50 + amount * 0.48];
}
export function waveSample(type, phase) {
  const cycle = (((phase / (2 * Math.PI)) % 1) + 1) % 1;
  if (type === "square") return cycle < 0.5 ? 1 : -1;
  if (type === "triangle") return 1 - 4 * Math.abs(cycle - 0.5);
  return Math.sin(phase);
}
export function makeParticles(count, width, height, random = Math.random) {
  return Array.from({ length: clamp(count, 100, 700) }, (_, index) => {
    const angle = random() * Math.PI * 2,
      radius = Math.min(width, height) * (0.1 + random() * 0.35);
    return {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      vx: Math.sin(angle) * 1.2,
      vy: -Math.cos(angle) * 1.2,
      hue: 165 + (index / count) * 115,
    };
  });
}
export function moveParticle(particle, target, mode, width, height, delta = 1) {
  const dx = target.x - particle.x,
    dy = target.y - particle.y,
    distance = Math.hypot(dx, dy) || 1;
  const strength =
    mode === "repel" ? Math.max(0, 1 - distance / 200) * -0.45 : 0.07;
  particle.vx =
    (particle.vx + (dx / distance) * strength + (dy / distance) * 0.018) *
    0.994;
  particle.vy =
    (particle.vy + (dy / distance) * strength - (dx / distance) * 0.018) *
    0.994;
  const speed = Math.hypot(particle.vx, particle.vy);
  if (speed > 3) {
    particle.vx *= 3 / speed;
    particle.vy *= 3 / speed;
  }
  particle.x += particle.vx * delta;
  particle.y += particle.vy * delta;
  if (particle.x < -5) particle.x = width + 5;
  if (particle.x > width + 5) particle.x = -5;
  if (particle.y < -5) particle.y = height + 5;
  if (particle.y > height + 5) particle.y = -5;
}
