// 2D Side-Scrolling Animated ASCII Action Hero
// Features multi-frame ASCII character animation with flowing scarf, punch combos, jumping, and shooting

import { soundSynth } from '../audio/SoundSynth.js';

export class PlatformPlayer {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 24;
    this.height = 36;

    // Movement & Physics
    this.speed = 200;
    this.jumpForce = -460;
    this.gravity = 1100;
    this.isGrounded = false;
    this.jumpsLeft = 2; // Double jump!
    this.facing = 1; // 1 = right, -1 = left

    // Health & Stats
    this.maxHp = 100;
    this.hp = 100;
    this.score = 0;
    this.kills = 0;
    this.flasks = 3;

    // Slide state
    this.isSliding = false;
    this.slideTimer = 0;

    // Animation & Combat States
    this.state = 'IDLE'; // 'IDLE', 'RUN', 'JUMP', 'FALL', 'ATTACK_PUNCH', 'ATTACK_SLASH', 'SLIDE'
    this.animTimer = 0;
    this.animFrame = 0;

    // Attack cooldowns
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackType = 'punch'; // 'punch', 'slash'
    this.comboStep = 0;

    // Scarf particles trail
    this.scarfTrail = [];

    // Invulnerability
    this.invulnTimer = 0;
    this.isDead = false;
  }

  update(dt, input, level, particles, damageText, camera, spawnProjectile) {
    if (this.isDead) return;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // 1. Horizontal Movement
    let moveDir = 0;
    if (input.keys.left) moveDir -= 1;
    if (input.keys.right) moveDir += 1;

    if (moveDir !== 0) {
      this.facing = moveDir;
      this.vx = moveDir * this.speed;
    } else {
      this.vx *= 0.75; // Friction
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // 2. Jumping (with double jump support)
    if (input.justPressed.jump || (input.justPressed.slash && input.keys.up)) {
      if (this.isGrounded) {
        this.vy = this.jumpForce;
        this.isGrounded = false;
        this.jumpsLeft = 1;
        soundSynth.playDash();
        particles.emitSparks(this.x, this.y + this.height / 2, 5, ['·', '.']);
      } else if (this.jumpsLeft > 0) {
        // Double jump!
        this.vy = this.jumpForce * 0.9;
        this.jumpsLeft = 0;
        soundSynth.playDash();
        particles.emitSparks(this.x, this.y + this.height / 2, 8, ['*', '°']);
      }
    }

    // 3. Gravity
    this.vy += this.gravity * dt;
    if (this.vy > 650) this.vy = 650; // Terminal velocity

    // 4. Combat / Attacks (Straight Punch & Blade Slash)
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.state = this.isGrounded ? (Math.abs(this.vx) > 10 ? 'RUN' : 'IDLE') : 'JUMP';
      }
    }

    // Primary Attack: Straight Punch / Combo
    if (input.justPressed.slash && this.attackCooldown <= 0 && !input.keys.up) {
      this.state = 'ATTACK_PUNCH';
      this.attackTimer = 0.2;
      this.attackCooldown = 0.24;
      this.comboStep = (this.comboStep + 1) % 2;
      soundSynth.playSwordSlash();

      // Punch hitbox
      const punchX = this.x + this.facing * 26;
      const punchY = this.y - 4;
      particles.emitSparks(punchX, punchY, 4, ['=', '>', '-']);

      // Check hit against enemies
      level.checkPlayerAttack(punchX, punchY, 20, 25, this, damageText, particles, camera);
    }

    // Secondary Attack: Throw Poison Flask (Sprite Fusion Poison VFX!)
    if (input.justPressed.dash && this.flasks > 0) {
      this.flasks--;
      soundSynth.playSwordSlash();
      damageText.add(this.x, this.y - 20, 'POISON FLASK!', 'crit');
      spawnProjectile(this.x, this.y - 10, this.facing * 320, -220, 'poison_flask');
    }

    // 5. Apply Movement & Collision with Level Platforms
    this.x += this.vx * dt;
    this.handleHorizontalCollision(level);

    this.y += this.vy * dt;
    this.handleVerticalCollision(level);

    // 6. Update Animations
    this.animTimer += dt;
    if (this.animTimer >= 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 6;
    }

    // Update state if not attacking
    if (this.attackTimer <= 0) {
      if (!this.isGrounded) {
        this.state = this.vy < 0 ? 'JUMP' : 'FALL';
      } else if (Math.abs(this.vx) > 10) {
        this.state = 'RUN';
      } else {
        this.state = 'IDLE';
      }
    }

    // 7. Update Scarf Physics Trail
    this.updateScarf(dt);
  }

  handleHorizontalCollision(level) {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Check level boundaries
    if (this.x - halfW < 0) {
      this.x = halfW;
      this.vx = 0;
    } else if (this.x + halfW > level.width) {
      this.x = level.width - halfW;
      this.vx = 0;
    }

    // Check solid walls in level
    if (level.isSolid(this.x + (this.vx > 0 ? halfW : -halfW), this.y)) {
      this.x -= this.vx * 0.016;
      this.vx = 0;
    }
  }

  handleVerticalCollision(level) {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Check ground collision
    const feetY = this.y + halfH;
    const groundY = level.getGroundHeight(this.x, feetY, halfW);

    if (feetY >= groundY && this.vy >= 0) {
      this.y = groundY - halfH;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpsLeft = 2;
    } else {
      this.isGrounded = false;
    }

    // Check bottom death pit
    if (this.y > level.height + 60) {
      this.takeDamage(100, null, null, null);
    }
  }

  updateScarf(dt) {
    // Spawn scarf segment at neck level
    const neckX = this.x - this.facing * 6;
    const neckY = this.y - 10;

    this.scarfTrail.unshift({ x: neckX, y: neckY, life: 1.0 });

    // Limit length
    if (this.scarfTrail.length > 5) {
      this.scarfTrail.pop();
    }

    // Trailing physics (scarf waves backward against movement direction)
    for (let i = 1; i < this.scarfTrail.length; i++) {
      const seg = this.scarfTrail[i];
      seg.life -= dt * 3;
      seg.x -= this.facing * (18 + Math.abs(this.vx) * 0.08) * dt;
      seg.y += Math.sin(Date.now() * 0.012 + i) * 6 * dt;
    }
  }

  takeDamage(amount, camera, damageText, particles) {
    if (this.isDead || this.invulnTimer > 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = 0.8;

    if (damageText) damageText.add(this.x, this.y - 20, `-${amount}`, 'normal');
    if (camera) camera.addShake(8, 0.25);
    if (particles) particles.emitSparks(this.x, this.y, 12, ['*', 'x', '!']);
    soundSynth.playPlayerHurt();

    if (this.hp <= 0) {
      this.isDead = true;
      soundSynth.playGameOver();
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    // Invulnerability blink
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Render Flowing Scarf in ASCII (~ ≈ ·)
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < this.scarfTrail.length; i++) {
      const seg = this.scarfTrail[i];
      const sPos = camera.worldToScreen(seg.x, seg.y);
      const glyph = i === 0 ? '~' : (i === 1 ? '≈' : '·');
      ctx.fillText(glyph, sPos.x, sPos.y);
    }

    // 2. Render Character Sprite in Multi-Line ASCII
    // Frame variations for Idle, Run, Jump, Attack
    const frames = this.getCharacterFrames();

    ctx.font = 'bold 13px monospace';
    const lineHeight = 11;
    const startY = screen.y - 18;

    frames.forEach((line, idx) => {
      // High contrast white glyphs
      ctx.fillStyle = '#ffffff';

      // Visor line: highlight visor with distinct contrast
      if (line.includes('■') || line.includes('O')) {
        ctx.fillStyle = '#ffffff';
      }

      ctx.fillText(line, screen.x, startY + idx * lineHeight);
    });

    ctx.restore();
  }

  getCharacterFrames() {
    const f = this.facing === 1;

    if (this.state === 'ATTACK_PUNCH') {
      // Punch lunge pose
      if (f) {
        return [
          '  [■■] ',
          ' ~|██|==O',
          '  /  > '
        ];
      } else {
        return [
          ' [■■]  ',
          'O==|██|~ ',
          '  <  \\ '
        ];
      }
    }

    if (this.state === 'JUMP') {
      // Tucked aerial pose
      return [
        ' [■■] ',
        '~|██|~',
        ' <  > '
      ];
    }

    if (this.state === 'FALL') {
      return [
        ' [■■] ',
        ' |██| ',
        ' /  \\ '
      ];
    }

    if (this.state === 'RUN') {
      // 4-frame running animation cycle
      const runCycles = [
        [
          f ? ' [■■] ' : ' [■■] ',
          f ? '~|██| ' : ' |██|~',
          f ? '  / > ' : ' < \\  '
        ],
        [
          f ? ' [■■] ' : ' [■■] ',
          f ? ' |██|~' : '~|██| ',
          f ? '  | | ' : '  | | '
        ],
        [
          f ? ' [■■] ' : ' [■■] ',
          f ? '~|██| ' : ' |██|~',
          f ? '  < \\ ' : ' / >  '
        ],
        [
          f ? ' [■■] ' : ' [■■] ',
          f ? ' |██|~' : '~|██| ',
          f ? '  | | ' : '  | | '
        ]
      ];
      return runCycles[this.animFrame % 4];
    }

    // IDLE State with breathing
    const breath = this.animFrame % 2 === 0;
    return [
      f ? ' [■■] ' : ' [■■] ',
      breath ? (f ? ' |██|~' : '~|██| ') : (f ? ' |██| ' : ' |██| '),
      '  / \\ '
    ];
  }
}

