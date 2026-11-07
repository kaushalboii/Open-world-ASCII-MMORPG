// Smashable Crates, Barrels, and Treasure Chests in Tiny Glyphs
// Breakable obstacles that yield gold, hearts, and secret items

import { soundSynth } from '../audio/SoundSynth.js';

export class Destructible {
  constructor(x, y, type = 'crate') {
    this.x = x;
    this.y = y;
    this.type = type; // 'crate', 'barrel', 'chest'
    this.radius = 8;
    this.isBroken = false;

    if (type === 'crate') {
      this.glyph = '[x]';
    } else if (type === 'barrel') {
      this.glyph = '[o]';
    } else if (type === 'chest') {
      this.glyph = '[=]';
    }
  }

  smash(player, entityManager, particles, damageText, camera) {
    if (this.isBroken) return;
    this.isBroken = true;

    soundSynth.playHit();
    camera.addShake(4, 0.15);

    // Splinter debris
    particles.emitSparks(this.x, this.y, 12, ['/', '\\', '·', 'x', '■']);

    // Loot drops
    if (this.type === 'chest') {
      soundSynth.playCoin();
      damageText.add(this.x, this.y, 'CHEST OPENED!', 'crit');
      entityManager.dropLoot(this.x, this.y);
      entityManager.dropLoot(this.x + 6, this.y);
      entityManager.dropLoot(this.x - 6, this.y);
    } else {
      // Crate / Barrel drop
      if (Math.random() < 0.75) {
        entityManager.dropLoot(this.x, this.y);
      }
    }
  }

  render(ctx, camera) {
    if (this.isBroken) return;

    const screen = camera.worldToScreen(this.x, this.y);
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(this.glyph, screen.x, screen.y);
    ctx.restore();
  }
}

