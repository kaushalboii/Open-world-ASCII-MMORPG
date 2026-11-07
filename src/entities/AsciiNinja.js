// Animated ASCII Martial Hero (Valen the Glyphwarden)
// Handcrafted multi-line ASCII art frames for Idle, 6-frame Run, Straight Punch, Jump, and Poison Flask throw

import { soundSynth } from '../audio/SoundSynth.js';

export class AsciiNinja {
  constructor(col = 15, row = 20) {
    this.x = col;
    this.y = row;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left

    // Stats
    this.maxHp = 100;
    this.hp = 100;
    this.score = 0;
    this.kills = 0;
    this.flasks = 3;

    // Movement & Physics in ASCII grid units
    this.speed = 22; // columns per second
    this.jumpForce = -24; // rows per second
    this.gravity = 55; // rows per second^2
    this.isGrounded = false;
    this.jumpsLeft = 2; // Double jump!

    // Animation states
    this.state = 'IDLE'; // 'IDLE', 'RUN', 'JUMP', 'FALL', 'PUNCH', 'SLIDE'
    this.animTimer = 0;
    this.animFrame = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.isDead = false;

    // Scarf waving trail
    this.scarfLength = 4;
  }

  update(dt, input, world, projectiles, particles, damageText) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // 1. Horizontal Movement
    let moveDir = 0;
    if (input.keys.left) moveDir -= 1;
    if (input.keys.right) moveDir += 1;

    if (moveDir !== 0) {
      this.facing = moveDir;
      this.vx = moveDir * this.speed;
    } else {
      this.vx *= 0.6;
      if (Math.abs(this.vx) < 1) this.vx = 0;
    }

    // 2. Jumping & Double Jump
    if (input.justPressed.jump || (input.justPressed.slash && input.keys.up)) {
      if (this.isGrounded) {
        this.vy = this.jumpForce;
        this.isGrounded = false;
        this.jumpsLeft = 1;
        soundSynth.playDash();
        particles.emit(this.x, this.y + 5, ['·', '.']);
      } else if (this.jumpsLeft > 0) {
        // Double jump!
        this.vy = this.jumpForce * 0.85;
        this.jumpsLeft = 0;
        soundSynth.playDash();
        particles.emit(this.x, this.y + 5, ['*', '°']);
        damageText.add(this.x, this.y - 2, 'DOUBLE JUMP!', 'crit');
      }
    }

    // 3. Gravity
    this.vy += this.gravity * dt;
    if (this.vy > 32) this.vy = 32;

    // Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.state = this.isGrounded ? (Math.abs(this.vx) > 1 ? 'RUN' : 'IDLE') : 'JUMP';
      }
    }

    if (input.justPressed.slash && this.attackCooldown <= 0 && !input.keys.up) {
      this.state = 'PUNCH';
      this.attackTimer = 0.22;
      this.attackCooldown = 0.26;
      soundSynth.playSwordSlash();

      // Punch impact zone
      const punchX = this.x + (this.facing === 1 ? 12 : -10);
      const punchY = this.y + 2;
      particles.emit(punchX, punchY, ['=', '>', '-', '*']);

      // Check hit against enemies
      world.checkMeleeHit(punchX, punchY, 8, 30, this, damageText, particles);
    }

    // Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
    if (input.justPressed.dash && this.flasks > 0) {
      this.flasks--;
      soundSynth.playSwordSlash();
      damageText.add(this.x, this.y - 3, 'TOXIC FLASK!', 'crit');
      projectiles.spawn(
        this.x + this.facing * 4,
        this.y,
        this.facing * 35,
        -18,
        'poison_flask'
      );
    }

    // 6. Movement & Collision
    this.x += this.vx * dt;
    if (this.x < 2) this.x = 2;
    if (this.x > world.cols - 14) this.x = world.cols - 14;

    this.y += this.vy * dt;

    // Ground collision
    const feetY = this.y + 6;
    const groundY = world.getGroundY(this.x + 3, feetY);

    if (feetY >= groundY && this.vy >= 0) {
      this.y = groundY - 6;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpsLeft = 2;
    } else {
      this.isGrounded = false;
    }

    // 7. Animation State Selection
    this.animTimer += dt;
    if (this.animTimer >= 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 6;
    }

    if (this.attackTimer <= 0) {
      if (!this.isGrounded) {
        this.state = this.vy < 0 ? 'JUMP' : 'FALL';
      } else if (Math.abs(this.vx) > 1) {
        this.state = 'RUN';
      } else {
        this.state = 'IDLE';
      }
    }
  }

  takeDamage(amount, damageText, particles) {
    if (this.isDead) return;

    this.hp = Math.max(0, this.hp - amount);
    soundSynth.playPlayerHurt();
    damageText.add(this.x, this.y - 2, `-${amount}`, 'normal');
    particles.emit(this.x, this.y, ['*', '!', 'x']);

    if (this.hp <= 0) {
      this.isDead = true;
      soundSynth.playGameOver();
    }
  }

  draw(grid) {
    const col = Math.round(this.x);
    const row = Math.round(this.y);
    const isFlipped = this.facing === -1;

    const frames = this.getCurrentFrames();
    grid.drawSprite(col, row, frames, isFlipped, '#ffffff');

    // Draw dynamic trailing scarf glyphs
    const scarfGlyphs = ['~', '≈', '~', '·'];
    for (let i = 0; i < this.scarfLength; i++) {
      const scarfX = col + (this.facing === 1 ? -1 - i : 8 + i);
      const scarfY = row + 2 + Math.floor(Math.sin(Date.now() * 0.015 + i) * 1.2);
      grid.setChar(scarfX, scarfY, scarfGlyphs[i % scarfGlyphs.length], '#ffffff', 0.8);
    }
  }

  getCurrentFrames() {
    if (this.state === 'PUNCH') {
      // Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
      return [
        '   .---.       ',
        '  |[===]|======(O)*',
        '  |/███\\|      ',
        '   \\▓▓▓/       ',
        '   /   \\       ',
        '  /_   _\\      '
      ];
    }

    if (this.state === 'JUMP') {
      return [
        '   .---.   ',
        '  |[===]|  ',
        '  |/███\\|  ',
        '   \\▓▓▓/   ',
        '   <   >   '
      ];
    }

    if (this.state === 'FALL') {
      return [
        '   .---.   ',
        '  |[===]|  ',
        '  |/███\\|  ',
        '   \\▓▓▓/   ',
        '   /   \\   ',
        '  /     \\  '
      ];
    }

    if (this.state === 'RUN') {
      // 6-frame dynamic running cycle
      const runCycles = [
        [
          '   .---.   ',
          '  |[===]|  ',
          '  |/███\\   ',
          '   \\▓▓▓/   ',
          '   /  /    ',
          '  /_  \\__  '
        ],
        [
          '   .---.   ',
          '  |[===]|  ',
          '  |/███\\|  ',
          '   \\▓▓▓/   ',
          '    | |    ',
          '   /_ \\_   '
        ],
        [
          '   .---.   ',
          '  |[===]|  ',
          '   \\███\\|  ',
          '   \\▓▓▓/   ',
          '    \\  \\   ',
          '  __/  _\\  '
        ],
        [
          '   .---.   ',
          '  |[===]|  ',
          '  |/███\\   ',
          '   \\▓▓▓/   ',
          '   /  /    ',
          '  /_  \\__  '
        ],
        [
          '   .---.   ',
          '  |[===]|  ',
          '  |/███\\|  ',
          '   \\▓▓▓/   ',
          '    | |    ',
          '   /_ \\_   '
        ],
        [
          '   .---.   ',
          '  |[===]|  ',
          '   \\███\\|  ',
          '   \\▓▓▓/   ',
          '    \\  \\   ',
          '  __/  _\\  '
        ]
      ];
      return runCycles[this.animFrame % 6];
    }

    // IDLE Stance with breathing
    const breath = this.animFrame % 2 === 0;
    return [
      '   .---.   ',
      '  |[===]|  ',
      breath ? '  |/███\\|  ' : '   /███\\   ',
      '   \\▓▓▓/   ',
      '   /   \\   ',
      '  /_   _\\  '
    ];
  }
}

