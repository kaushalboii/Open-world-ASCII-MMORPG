// Smooth Follow Camera with Boundary Clamping & Screen Shake

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;

    // Screen Shake
    this.shakeMagnitude = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  resize(viewportWidth, viewportHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  follow(targetX, targetY, dt, lerpSpeed = 6.0) {
    this.targetX = targetX - this.viewportWidth / 2;
    this.targetY = targetY - this.viewportHeight / 2;

    // Smooth exponential lerp
    const factor = 1 - Math.exp(-lerpSpeed * dt);
    this.x += (this.targetX - this.x) * factor;
    this.y += (this.targetY - this.y) * factor;

    // Process screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeMagnitude;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeMagnitude;
      if (this.shakeDuration <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeMagnitude = 0;
      }
    }
  }

  clamp(worldWidth, worldHeight) {
    const maxX = Math.max(0, worldWidth - this.viewportWidth);
    const maxY = Math.max(0, worldHeight - this.viewportHeight);
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
  }

  addShake(magnitude, duration = 0.2) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  worldToScreen(wx, wy) {
    return {
      x: Math.round(wx - this.x + this.shakeOffsetX),
      y: Math.round(wy - this.y + this.shakeOffsetY)
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx + this.x - this.shakeOffsetX,
      y: sy + this.y - this.shakeOffsetY
    };
  }

  getVisibleTileBounds(tileSize, mapWidth, mapHeight) {
    const startX = Math.max(0, Math.floor((this.x - 20) / tileSize));
    const endX = Math.min(mapWidth - 1, Math.ceil((this.x + this.viewportWidth + 20) / tileSize));
    const startY = Math.max(0, Math.floor((this.y - 20) / tileSize));
    const endY = Math.min(mapHeight - 1, Math.ceil((this.y + this.viewportHeight + 20) / tileSize));

    return { startX, endX, startY, endY };
  }
}

