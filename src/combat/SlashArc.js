// Directional Animated Sword Slash Arc in Black & White ASCII
// Sweeps a crescent blade trail in front of the Knight

export class SlashArc {
  constructor(originX, originY, angle, radius = 24, arcSpan = Math.PI * 0.75) {
    this.originX = originX;
    this.originY = originY;
    this.angle = angle; // Central angle of the swing in radians
    this.radius = radius;
    this.arcSpan = arcSpan;
    this.duration = 0.18; // Seconds of slash animation
    this.age = 0;
    this.isFinished = false;

    // Create 7 slash segment points along the crescent arc
    this.segments = [];
    const numPoints = 7;
    for (let i = 0; i < numPoints; i++) {
      const offset = (i / (numPoints - 1) - 0.5) * this.arcSpan;
      const ptAngle = this.angle + offset;
      const glyphs = ['/', ')', '>', '—', '\\', '(', '<'];
      const glyph = this.pickGlyphForAngle(ptAngle);
      this.segments.push({
        angleOffset: offset,
        glyph: glyph,
        radiusMult: 0.9 + Math.sin((i / (numPoints - 1)) * Math.PI) * 0.3
      });
    }
  }

  pickGlyphForAngle(angle) {
    // Normalize to [0, 2PI)
    let a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    // 8 directional glyph mappings
    if (a >= 7 * Math.PI / 4 || a < Math.PI / 4) return ')';
    if (a >= Math.PI / 4 && a < 3 * Math.PI / 4) return 'v';
    if (a >= 3 * Math.PI / 4 && a < 5 * Math.PI / 4) return '(';
    return '^';
  }

  update(dt, currentX, currentY) {
    this.age += dt;
    // Follow the player slightly as they move
    this.originX = currentX;
    this.originY = currentY;

    if (this.age >= this.duration) {
      this.isFinished = true;
    }
  }

  render(ctx, camera) {
    if (this.isFinished) return;

    const progress = this.age / this.duration; // 0.0 to 1.0
    const alpha = Math.max(0, 1 - progress * 1.2);

    ctx.save();
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer glow & primary slash glyphs
    this.segments.forEach((seg, idx) => {
      // Sweeping motion: segments appear in rapid succession
      const sweepProgress = idx / this.segments.length;
      if (progress < sweepProgress * 0.4) return;

      const currentRadius = this.radius * seg.radiusMult * (0.8 + progress * 0.4);
      const ptAngle = this.angle + seg.angleOffset;
      const wx = this.originX + Math.cos(ptAngle) * currentRadius;
      const wy = this.originY + Math.sin(ptAngle) * currentRadius;

      const screen = camera.worldToScreen(wx, wy);

      // Core white slash glyph
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillText(seg.glyph, screen.x, screen.y);

      // Secondary motion blur spark
      if (progress < 0.6) {
        ctx.fillStyle = `rgba(180, 180, 180, ${alpha * 0.6})`;
        ctx.fillText('·', screen.x - Math.cos(ptAngle) * 6, screen.y - Math.sin(ptAngle) * 6);
      }
    });

    ctx.restore();
  }

  // Hitbox test against a target entity
  checkHit(targetX, targetY, targetRadius = 12) {
    const dx = targetX - this.originX;
    const dy = targetY - this.originY;
    const dist = Math.hypot(dx, dy);

    // Range check
    if (dist > this.radius + targetRadius || dist < 4) return false;

    // Angle check
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(targetAngle - this.angle);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

    return angleDiff <= this.arcSpan * 0.65;
  }
}

