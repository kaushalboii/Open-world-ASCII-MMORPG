// RigExplorer: Sprite Fusion AI Pixel Art Animator & 3D Skeletal Rig Studio
// Recreates the Sprite Fusion AI Pixel Animator interface:
// - States: [Run], [Idle], [Jump], [Attack]
// - Motion Prompt: "Straight punch animation"
// - Starting Sprite (Rest Stance) vs AI Animation (Live 60 FPS) side-by-side
// - Smooth ASCII Values vs Pixel Art vs Hybrid Matrix rendering
// - Dynamic Flowing Magenta Scarf and Cyan Visor Highlight

import { posed, skeleton, posedParts, STAND } from '../core/rig.js';
import { READY, ANIM_IDLE, ANIM_RUN, ANIM_JUMP, ANIM_STRAIGHT_PUNCH } from '../core/poses.js';
import { createFrame, clearFrame, composite } from '../core/index.js';

export class RigExplorer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Animator State: 'RUN', 'IDLE', 'JUMP', 'ATTACK'
    this.animState = 'ATTACK';
    this.motionPrompt = 'Straight punch animation';
    this.viewMode = 'pixel'; // 'pixel', 'ascii', 'hybrid', 'bones'
    this.theme = 'color';    // 'color', 'bw', 'green'

    // Interactive custom pose overrides (when adjusting sliders)
    this.yaw = 0;           // Body rotation
    this.lean = 0;          // Spine lean
    this.crouch = 2;        // Hip crouch
    this.fx = 11;           // Near hand reach
    this.weaponAngle = 0.4; // Weapon angle
    this.weapon = 'none';   // 'none', 'sword', 'staff'
    this.autoSpin = false;
    this.flip = false;

    // Animation playback
    this.playing = true;
    this.speed = 1.0;
    this.animTime = 0;
    this.currentFrameIdx = 0;

    // Dual render buffers
    this.W = 140;
    this.H = 140;

    // Buffer 1: Starting Sprite
    this.startFrame = createFrame(this.W, this.H);
    this.startImgData = this.ctx.createImageData(this.W, this.H);

    // Buffer 2: Live Animated Sprite
    this.animFrameBuf = createFrame(this.W, this.H);
    this.animImgData = this.ctx.createImageData(this.W, this.H);

    // Dynamic scarf nodes for both views
    this.startScarf = [
      { x: this.W / 2 - 3, y: this.H / 2 - 2 },
      { x: this.W / 2 - 8, y: this.H / 2 - 1 },
      { x: this.W / 2 - 14, y: this.H / 2 },
      { x: this.W / 2 - 20, y: this.H / 2 + 1 },
    ];
    this.animScarf = [
      { x: this.W / 2 - 3, y: this.H / 2 - 2 },
      { x: this.W / 2 - 8, y: this.H / 2 - 1 },
      { x: this.W / 2 - 14, y: this.H / 2 },
      { x: this.W / 2 - 20, y: this.H / 2 + 1 },
    ];
  }

  setAnimState(state) {
    this.animState = state;
    this.animTime = 0;
    this.currentFrameIdx = 0;

    const prompts = {
      RUN: '6-frame athletic sprint run cycle',
      IDLE: 'Idle breathing martial stance',
      JUMP: 'Airborne dynamic leap and tuck',
      ATTACK: 'Straight punch animation',
    };
    this.motionPrompt = prompts[state] || 'Straight punch animation';
  }

  setMotionPrompt(prompt) {
    this.motionPrompt = prompt;
    const lower = prompt.toLowerCase();
    if (lower.includes('punch') || lower.includes('attack') || lower.includes('strike')) {
      this.animState = 'ATTACK';
    } else if (lower.includes('run') || lower.includes('sprint') || lower.includes('walk')) {
      this.animState = 'RUN';
    } else if (lower.includes('jump') || lower.includes('leap') || lower.includes('air')) {
      this.animState = 'JUMP';
    } else if (lower.includes('idle') || lower.includes('stand') || lower.includes('breathe')) {
      this.animState = 'IDLE';
    }
    this.animTime = 0;
  }

  getCurrentAnimFrames() {
    switch (this.animState) {
      case 'RUN':
        return ANIM_RUN;
      case 'IDLE':
        return ANIM_IDLE;
      case 'JUMP':
        return ANIM_JUMP;
      case 'ATTACK':
      default:
        return ANIM_STRAIGHT_PUNCH;
    }
  }

  getActivePose() {
    const frames = this.getCurrentAnimFrames();
    const fps = this.animState === 'RUN' ? 10 : this.animState === 'ATTACK' ? 7 : 4;
    const totalDuration = frames.length / fps;
    const t = (this.animTime % totalDuration) * fps;
    const idx = Math.floor(t) % frames.length;
    this.currentFrameIdx = idx;

    const base = frames[idx];
    return {
      ...base,
      yaw: this.yaw,
      weapon: this.weapon !== 'none' ? this.weapon : undefined,
      sa: this.weaponAngle,
    };
  }

  getStartingSpritePose() {
    return {
      ...READY,
      crouch: 2,
      lean: 0,
      fx: 10,
      fy: -20,
      bx: 8,
      by: -20,
      ffx: 6,
      fbx: -6,
    };
  }

  update(dt) {
    if (this.playing) {
      this.animTime += dt * this.speed;
    }

    if (this.autoSpin) {
      this.yaw = Math.sin(this.animTime * 1.5) * 1.2;
    }

    // Update animated scarf fluttering
    const cx = this.W / 2;
    const cy = this.H / 2 + 26;
    const flipSign = this.flip ? 1 : -1;

    // Starting sprite scarf (gentle wave)
    for (let i = 1; i < this.startScarf.length; i++) {
      const prev = this.startScarf[i - 1];
      const targetX = prev.x + flipSign * 5;
      const targetY = prev.y + Math.sin(performance.now() * 0.005 + i * 0.8) * 1.2;
      this.startScarf[i].x += (targetX - this.startScarf[i].x) * 0.2;
      this.startScarf[i].y += (targetY - this.startScarf[i].y) * 0.2;
    }

    // Animated sprite scarf (dynamic high speed flutter)
    const activePose = this.getActivePose();
    const headX = cx + (activePose.lean || 0) * 0.5;
    const headY = cy - 28;
    this.animScarf[0] = { x: headX, y: headY };

    for (let i = 1; i < this.animScarf.length; i++) {
      const prev = this.animScarf[i - 1];
      const wave = Math.sin(this.animTime * 12 + i * 1.2) * (this.animState === 'RUN' ? 3.0 : 1.8);
      const targetX = prev.x + flipSign * (this.animState === 'RUN' ? 6.5 : 5.0);
      const targetY = prev.y + wave + 0.8;
      this.animScarf[i].x += (targetX - this.animScarf[i].x) * Math.min(1, 24 * dt);
      this.animScarf[i].y += (targetY - this.animScarf[i].y) * Math.min(1, 24 * dt);
    }
  }

  // Draw character onto a buffer frame with floor shadow and scarf
  rasterizeCharacter(frame, imgData, pose, scarfNodes, isAnimated = false) {
    clearFrame(frame);
    const r = posed(pose);
    const cx = Math.floor(this.W / 2);
    const cy = Math.floor(this.H / 2) + 26;
    const flip = this.flip;

    // Floor Shadow
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < this.W && py >= 0 && py < this.H) {
          frame.color[py * this.W + px] = 0xff100c14;
        }
      }
    }

    // Posed Pixels
    for (let i = 0; i < r.n; i++) {
      const px = flip ? cx - r.xs[i] - 1 : cx + r.xs[i];
      const py = cy + r.ys[i];
      if (px >= 0 && px < this.W && py >= 0 && py < this.H) {
        const idx = py * this.W + px;
        if (this.theme === 'bw') {
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          frame.color[idx] = lum > 80 ? 0xffffffff : 0xff161616;
        } else if (this.theme === 'green') {
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          frame.color[idx] = (255 << 24) | ((lum > 60 ? 240 : 40) << 8);
        } else {
          frame.color[idx] = r.color[i];
        }
      }
    }

    // Visor Cyan Glow
    const visorX = flip ? cx - 3 : cx + 3;
    const visorY = cy - 29;
    const visorColor = this.theme === 'bw' ? 0xffffffff : this.theme === 'green' ? 0xff20ff80 : 0xff00f0ff;
    for (let dx = -1; dx <= 2; dx++) {
      const vx = visorX + dx;
      if (vx >= 0 && vx < this.W && visorY >= 0 && visorY < this.H) {
        frame.color[visorY * this.W + vx] = visorColor;
        frame.light[visorY * this.W + vx] = visorColor;
      }
    }

    // Dynamic Magenta Flowing Scarf
    const scarfColor = this.theme === 'bw' ? 0xffffffff : this.theme === 'green' ? 0xff20ff80 : 0xfff53cd1;
    const scarfHighlight = this.theme === 'bw' ? 0xffffffff : this.theme === 'green' ? 0xff80ffa0 : 0xffff7ec4;

    for (let i = 0; i < scarfNodes.length; i++) {
      const node = scarfNodes[i];
      const px = Math.round(node.x);
      const py = Math.round(node.y);
      const radius = i === 0 ? 2 : 1;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = px + dx;
          const sy = py + dy;
          if (sx >= 0 && sx < this.W && sy >= 0 && sy < this.H) {
            frame.color[sy * this.W + sx] = dy === -radius ? scarfHighlight : scarfColor;
          }
        }
      }
    }

    // Attack kinetic punch aura (for straight punch full extension)
    if (isAnimated && this.animState === 'ATTACK' && (this.currentFrameIdx === 2 || this.currentFrameIdx === 3)) {
      const fistX = flip ? cx - 18 : cx + 18;
      const fistY = cy - 22;
      const cyanGlow = 0xff00f0ff;
      for (let d = 1; d <= 4; d++) {
        const gx = flip ? fistX - d : fistX + d;
        if (gx >= 0 && gx < this.W && fistY >= 0 && fistY < this.H) {
          frame.color[fistY * this.W + gx] = cyanGlow;
          frame.light[fistY * this.W + gx] = cyanGlow;
        }
      }
    }

    composite(frame, imgData.data, 0x00000000); // Transparent background for checkerboard
  }

  // Draw the entire Sprite Fusion-style Animation Studio UI onto target canvas
  draw(targetCtx, renderW, renderH) {
    targetCtx.save();

    // 1. Dark Studio Backdrop
    targetCtx.fillStyle = '#09090e';
    targetCtx.fillRect(0, 0, renderW, renderH);

    // 2. Header Banner: "ANIMATE YOUR PIXEL ART IN SECONDS"
    targetCtx.fillStyle = '#101018';
    targetCtx.fillRect(16, 12, renderW - 32, 38);
    targetCtx.strokeStyle = '#282838';
    targetCtx.strokeRect(16, 12, renderW - 32, 38);

    targetCtx.fillStyle = '#00f0ff';
    targetCtx.font = 'bold 12px "Courier New", monospace';
    targetCtx.fillText('ANIMATE YOUR PIXEL ART IN SECONDS • AI PIXEL ART ANIMATOR', 28, 30);

    targetCtx.fillStyle = '#888899';
    targetCtx.font = '10px "Courier New", monospace';
    targetCtx.fillText('Inverse Kinematics 3D Skeleton + Procedural Shading + Smooth ASCII Matrix', 28, 44);

    // View Mode Pills on top right
    const modes = [
      { id: 'pixel', label: '🎨 PIXEL ART' },
      { id: 'ascii', label: '🔤 SMOOTH ASCII' },
      { id: 'hybrid', label: '⚡ HYBRID' },
      { id: 'bones', label: '🦴 3D SKELETON' },
    ];
    let modeX = renderW - 380;
    modes.forEach((m) => {
      const isActive = this.viewMode === m.id;
      targetCtx.fillStyle = isActive ? '#00f0ff' : '#1a1a26';
      targetCtx.fillRect(modeX, 20, 84, 22);
      targetCtx.strokeStyle = isActive ? '#00f0ff' : '#333348';
      targetCtx.strokeRect(modeX, 20, 84, 22);

      targetCtx.fillStyle = isActive ? '#000000' : '#bbbbcc';
      targetCtx.font = 'bold 9.5px "Courier New", monospace';
      targetCtx.fillText(m.label, modeX + 6, 35);
      modeX += 88;
    });

    // 3. State Tabs Bar: [ Run ] [ Idle ] [ Jump ] [ Attack ]
    const states = [
      { id: 'RUN', label: '🏃 Run', count: '6 frames' },
      { id: 'IDLE', label: '🧘 Idle', count: '4 frames' },
      { id: 'JUMP', label: '🦘 Jump', count: '3 frames' },
      { id: 'ATTACK', label: '🥊 Attack (Straight Punch)', count: '5 frames' },
    ];

    const tabW = (renderW - 32 - 18) / 4;
    states.forEach((st, idx) => {
      const tx = 16 + idx * (tabW + 6);
      const ty = 56;
      const isActive = this.animState === st.id;

      targetCtx.fillStyle = isActive ? '#1c2438' : '#101016';
      targetCtx.fillRect(tx, ty, tabW, 28);
      targetCtx.strokeStyle = isActive ? '#00f0ff' : '#282838';
      targetCtx.lineWidth = isActive ? 1.5 : 1;
      targetCtx.strokeRect(tx, ty, tabW, 28);

      targetCtx.fillStyle = isActive ? '#00f0ff' : '#9999aa';
      targetCtx.font = 'bold 11px "Courier New", monospace';
      targetCtx.fillText(st.label, tx + 12, ty + 18);

      targetCtx.fillStyle = '#666677';
      targetCtx.font = '9px "Courier New", monospace';
      targetCtx.fillText(st.count, tx + tabW - 60, ty + 18);
    });

    // 4. Main Dual Viewports: "Starting sprite" vs "AI animation"
    const halfW = Math.floor((renderW - 40) / 2);
    const viewY = 90;
    const viewH = renderH - 180;

    // Viewport 1: STARTING SPRITE
    this.renderViewport(targetCtx, 16, viewY, halfW, viewH, 'Starting sprite', false);

    // Viewport 2: AI ANIMATION
    this.renderViewport(targetCtx, 16 + halfW + 8, viewY, halfW, viewH, 'AI animation', true);

    // 5. Motion Prompt Input Box (Directly matching the screenshot!)
    const promptY = renderH - 82;
    targetCtx.fillStyle = '#101018';
    targetCtx.fillRect(16, promptY, renderW - 32, 42);
    targetCtx.strokeStyle = '#282838';
    targetCtx.strokeRect(16, promptY, renderW - 32, 42);

    targetCtx.fillStyle = '#888899';
    targetCtx.font = 'bold 10px "Courier New", monospace';
    targetCtx.fillText('Motion prompt', 28, promptY + 16);

    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = 'bold 13px "Courier New", monospace';
    targetCtx.fillText(`"${this.motionPrompt}"`, 28, promptY + 33);

    // Prompt Presets Buttons
    const presets = ['Straight punch animation', '6-frame sprint run', 'Idle breathing stance', 'Airborne leap'];
    let prX = renderW - 460;
    presets.forEach((pr) => {
      targetCtx.fillStyle = '#181824';
      targetCtx.fillRect(prX, promptY + 10, 100, 22);
      targetCtx.strokeStyle = '#333348';
      targetCtx.strokeRect(prX, promptY + 10, 100, 22);

      targetCtx.fillStyle = '#00f0ff';
      targetCtx.font = '9px "Courier New", monospace';
      targetCtx.fillText(pr.split(' ')[0], prX + 12, promptY + 25);
      prX += 106;
    });

    // 6. Bottom Status Footer
    targetCtx.fillStyle = '#666677';
    targetCtx.font = '10px "Courier New", monospace';
    const activePose = this.getActivePose();
    const sk = skeleton(activePose);
    const r = posed(activePose);
    targetCtx.fillText(
      `State: ${this.animState} | Frame: ${this.currentFrameIdx + 1}/${this.getCurrentAnimFrames().length} | Speed: ${this.speed}x | Yaw: ${(this.yaw * (180 / Math.PI)).toFixed(0)}° | Pixels: ${r.n} | IK Bones: ${sk.bones.length}`,
      20,
      renderH - 18
    );

    targetCtx.fillStyle = '#00ff88';
    targetCtx.fillText('⚡ The Boundless Spiral Engine • Zero External Assets • Created by Kaushal', renderW - 490, renderH - 18);

    targetCtx.restore();
  }

  // Renders a viewport with transparent checkerboard, character, and label
  renderViewport(targetCtx, vx, vy, vw, vh, title, isAnimated) {
    // Backdrop frame
    targetCtx.fillStyle = '#0d0d14';
    targetCtx.fillRect(vx, vy, vw, vh);
    targetCtx.strokeStyle = isAnimated ? '#00f0ff' : '#282838';
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(vx, vy, vw, vh);

    // Title Tag
    targetCtx.fillStyle = isAnimated ? '#00f0ff' : '#aaaaaa';
    targetCtx.font = 'bold 11px "Courier New", monospace';
    targetCtx.fillText(title, vx + 14, vy + 20);

    // Inner Checkerboard Stage (Matches Sprite Fusion transparency checkerboard)
    const stageMargin = 28;
    const stageX = vx + stageMargin;
    const stageY = vy + stageMargin;
    const stageW = vw - stageMargin * 2;
    const stageH = vh - stageMargin * 2 - 6;

    // Draw dark checkerboard
    const checkSize = 10;
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(stageX, stageY, stageW, stageH);
    targetCtx.clip();

    for (let y = stageY; y < stageY + stageH; y += checkSize) {
      for (let x = stageX; x < stageX + stageW; x += checkSize) {
        const isDark = ((Math.floor((x - stageX) / checkSize) + Math.floor((y - stageY) / checkSize)) % 2) === 0;
        targetCtx.fillStyle = isDark ? '#14141e' : '#1c1c28';
        targetCtx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Determine pose to draw
    const pose = isAnimated ? this.getActivePose() : this.getStartingSpritePose();
    const scarf = isAnimated ? this.animScarf : this.startScarf;
    const charScale = 3.6;
    const renderSize = this.W * charScale;
    const charX = stageX + (stageW - renderSize) / 2;
    const charY = stageY + (stageH - renderSize) / 2 + 10;

    // View Modes:
    if (this.viewMode === 'bones') {
      // 3D Skeleton Wireframe
      this.drawSkeletonWireframe(targetCtx, stageX + stageW / 2, stageY + stageH / 2 + 20, pose, charScale * 1.05);
    } else if (this.viewMode === 'ascii') {
      // Pure Smooth ASCII Matrix
      this.drawSmoothAsciiCharacter(targetCtx, stageX + stageW / 2, stageY + stageH / 2 - 20, pose, scarf, isAnimated);
    } else if (this.viewMode === 'hybrid') {
      // Pixel Art + Smooth ASCII Aura
      const frameBuf = isAnimated ? this.animFrameBuf : this.startFrame;
      const imgData = isAnimated ? this.animImgData : this.startImgData;
      this.rasterizeCharacter(frameBuf, imgData, pose, scarf, isAnimated);

      // Offscreen raster to canvas
      this.ctx.putImageData(imgData, 0, 0);
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.globalAlpha = 0.85;
      targetCtx.drawImage(this.canvas, charX, charY, renderSize, renderSize);
      targetCtx.globalAlpha = 1.0;

      // Overlay luminous ASCII glyphs at joints and head
      this.drawAsciiOverlay(targetCtx, stageX + stageW / 2, stageY + stageH / 2 - 20, pose);
    } else {
      // Pure Pixel Art (Matches the exact sprite in the uploaded screenshot!)
      const frameBuf = isAnimated ? this.animFrameBuf : this.startFrame;
      const imgData = isAnimated ? this.animImgData : this.startImgData;
      this.rasterizeCharacter(frameBuf, imgData, pose, scarf, isAnimated);

      this.ctx.putImageData(imgData, 0, 0);
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.drawImage(this.canvas, charX, charY, renderSize, renderSize);
    }

    targetCtx.restore();
  }

  // Draw 3D IK Skeleton Wireframe
  drawSkeletonWireframe(targetCtx, cx, cy, pose, scale) {
    const sk = skeleton(pose);
    targetCtx.lineWidth = 2.2;
    targetCtx.strokeStyle = '#00f0ff';

    for (const [from, to] of sk.bones) {
      const p1 = sk.joints[from];
      const p2 = sk.joints[to];
      if (p1 && p2) {
        targetCtx.beginPath();
        targetCtx.moveTo(cx + p1[0] * scale, cy + p1[1] * scale);
        targetCtx.lineTo(cx + p2[0] * scale, cy + p2[1] * scale);
        targetCtx.stroke();
      }
    }

    for (const [name, pt] of Object.entries(sk.joints)) {
      const isHandle = sk.handles.includes(name);
      targetCtx.fillStyle = isHandle ? '#ff3c88' : '#ffffff';
      targetCtx.beginPath();
      targetCtx.arc(cx + pt[0] * scale, cy + pt[1] * scale, isHandle ? 4.5 : 2.5, 0, Math.PI * 2);
      targetCtx.fill();
    }
  }

  // Draw Smooth ASCII Character (Directly satisfies "smooth ascii values" request!)
  drawSmoothAsciiCharacter(targetCtx, cx, cy, pose, scarf, isAnimated) {
    const r = posed(pose);
    const flip = this.flip;
    const cellW = 8;
    const cellH = 10;
    const gridCols = 24;
    const gridRows = 38;

    // Character grid cells: char and color
    const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(null));

    // Map posed pixels to ASCII cells
    for (let i = 0; i < r.n; i++) {
      const px = flip ? -r.xs[i] - 1 : r.xs[i];
      const py = r.ys[i];
      const gx = Math.floor(px + 12);
      const gy = Math.floor(py + 38);

      if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
        const c = r.color[i];
        const red = c & 255;
        const green = (c >>> 8) & 255;
        const blue = (c >>> 16) & 255;
        const lum = (red * 0.3 + green * 0.59 + blue * 0.11) / 255;

        let ch = '░';
        if (lum > 0.85) ch = '█';
        else if (lum > 0.6) ch = '▓';
        else if (lum > 0.35) ch = '▒';

        // Visor recognition
        if (green > 200 && blue > 200 && red < 80) {
          ch = '=';
        } else if (red > 220 && green > 220 && blue > 220) {
          // White sneakers
          ch = '■';
        }

        grid[gy][gx] = { ch, color: `rgb(${red},${green},${blue})` };
      }
    }

    // Render ASCII Grid with glowing font
    targetCtx.font = 'bold 9px "Courier New", monospace';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';

    const originX = cx - (gridCols * cellW) / 2;
    const originY = cy - (gridRows * cellH) / 2 + 10;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cell = grid[r][c];
        if (cell) {
          targetCtx.fillStyle = cell.color;
          targetCtx.fillText(cell.ch, originX + c * cellW, originY + r * cellH);
        }
      }
    }

    // Draw waving pink scarf in ASCII glyphs
    const scarfGlyphs = ['~', '≈', '~', '*'];
    scarf.forEach((node, i) => {
      const sx = cx + (node.x - this.W / 2) * 2.8;
      const sy = cy + (node.y - this.H / 2) * 2.8;
      targetCtx.fillStyle = '#ff2a85';
      targetCtx.font = 'bold 11px "Courier New", monospace';
      targetCtx.fillText(scarfGlyphs[i % scarfGlyphs.length], sx, sy);
    });

    // Draw straight punch kinetic ASCII blast
    if (isAnimated && this.animState === 'ATTACK' && (this.currentFrameIdx === 2 || this.currentFrameIdx === 3)) {
      const punchX = cx + (flip ? -45 : 45);
      const punchY = cy + 12;
      targetCtx.fillStyle = '#00f0ff';
      targetCtx.font = 'bold 14px "Courier New", monospace';
      targetCtx.fillText('====>(O)*', punchX, punchY);
    }
  }

  // Draw overlay luminous ASCII glyphs for Hybrid View
  drawAsciiOverlay(targetCtx, cx, cy, pose) {
    const sk = skeleton(pose);
    targetCtx.font = 'bold 9px "Courier New", monospace';
    targetCtx.fillStyle = '#00f0ff';
    targetCtx.textAlign = 'center';

    for (const [name, pt] of Object.entries(sk.joints)) {
      const sx = cx + pt[0] * 3.6;
      const sy = cy + pt[1] * 3.6 + 40;
      targetCtx.fillText('+', sx, sy);
    }
  }

  // Handle canvas clicks (e.g. clicking state tabs or view mode pills)
  handleClick(x, y, renderW, renderH) {
    // Mode pills on top right
    const modes = ['pixel', 'ascii', 'hybrid', 'bones'];
    let modeX = renderW - 380;
    for (const m of modes) {
      if (x >= modeX && x <= modeX + 84 && y >= 20 && y <= 42) {
        this.viewMode = m;
        return true;
      }
      modeX += 88;
    }

    // State tabs [ Run ] [ Idle ] [ Jump ] [ Attack ]
    const states = ['RUN', 'IDLE', 'JUMP', 'ATTACK'];
    const tabW = (renderW - 32 - 18) / 4;
    for (let i = 0; i < states.length; i++) {
      const tx = 16 + i * (tabW + 6);
      if (x >= tx && x <= tx + tabW && y >= 56 && y <= 84) {
        this.setAnimState(states[i]);
        return true;
      }
    }

    // Preset buttons at bottom
    const presets = [
      { prompt: 'Straight punch animation', state: 'ATTACK' },
      { prompt: '6-frame sprint run cycle', state: 'RUN' },
      { prompt: 'Idle breathing martial stance', state: 'IDLE' },
      { prompt: 'Airborne dynamic leap and tuck', state: 'JUMP' },
    ];
    let prX = renderW - 460;
    for (const p of presets) {
      if (x >= prX && x <= prX + 100 && y >= renderH - 72 && y <= renderH - 50) {
        this.setAnimState(p.state);
        this.motionPrompt = p.prompt;
        return true;
      }
      prX += 106;
    }

    return false;
  }
}
