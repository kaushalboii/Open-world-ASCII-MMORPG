// RigExplorer: Interactive 3D Skeletal Rigging Visualizer & "How Pixel Art Is Built" Explainer
// Visualizes 3D IK skeletal bones, rendered 24x38 pixels, exploded body parts, and acting timing

import { posed, skeleton, posedParts, STAND } from '../core/rig.js';
import { READY } from '../core/poses.js';
import { createFrame, clearFrame, composite } from '../core/index.js';

export class RigExplorer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Interactive pose parameters
    this.yaw = 0;          // -3.14 to +3.14
    this.lean = 0;         // -8 to +8
    this.crouch = 2;       // 0 to 10
    this.fx = 11;          // Near hand X (-15 to 20)
    this.fy = -21;         // Near hand Y (-35 to -5)
    this.weaponAngle = 0.4;// Weapon rotation
    this.weapon = 'sword'; // 'sword', 'staff', 'none'

    this.viewMode = 'both'; // 'both', 'skeleton', 'pixels', 'exploded'
    this.theme = 'color';   // 'color', 'bw', 'green'
    this.animTime = 0;
    this.autoSpin = false;

    // Buffer for rasterizing
    this.W = 120;
    this.H = 120;
    this.frame = createFrame(this.W, this.H);
    this.imgData = this.ctx.createImageData(this.W, this.H);
  }

  getCurrentPose() {
    return {
      ...READY,
      yaw: this.yaw,
      lean: this.lean,
      crouch: this.crouch,
      fx: this.fx,
      fy: this.fy,
      weapon: this.weapon,
      sa: this.weaponAngle,
    };
  }

  update(dt) {
    this.animTime += dt;
    if (this.autoSpin) {
      this.yaw = Math.sin(this.animTime * 1.5) * 1.2;
    }
  }

  draw(targetCtx, renderW, renderH) {
    const pose = this.getCurrentPose();
    const r = posed(pose);
    const sk = skeleton(pose);
    const parts = posedParts(pose);

    // Render pixel art character onto local frame
    clearFrame(this.frame);
    const cx = Math.floor(this.W / 2);
    const cy = Math.floor(this.H / 2) + 26;

    // Shadow
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < this.W && py >= 0 && py < this.H) {
          this.frame.color[py * this.W + px] = 0xff100c14;
        }
      }
    }

    // Paint posed pixels
    for (let i = 0; i < r.n; i++) {
      const px = cx + r.xs[i];
      const py = cy + r.ys[i];
      if (px >= 0 && px < this.W && py >= 0 && py < this.H) {
        const idx = py * this.W + px;
        if (this.theme === 'bw') {
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          this.frame.color[idx] = lum > 80 ? 0xffffffff : 0xff181818;
        } else if (this.theme === 'green') {
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          this.frame.color[idx] = (255 << 24) | ((lum > 60 ? 240 : 40) << 8);
        } else {
          this.frame.color[idx] = r.color[i];
        }
      }
    }

    composite(this.frame, this.imgData.data, 0xff0d0b14);
    this.ctx.putImageData(this.imgData, 0, 0);

    // Draw main stage
    targetCtx.save();
    targetCtx.fillStyle = '#0a0a0f';
    targetCtx.fillRect(0, 0, renderW, renderH);

    // Split View Layout
    const halfW = Math.floor(renderW / 2);

    // Left Pane: 3D Skeleton IK Wireframe
    targetCtx.fillStyle = '#11111a';
    targetCtx.fillRect(16, 40, halfW - 24, renderH - 60);
    targetCtx.strokeStyle = '#333344';
    targetCtx.strokeRect(16, 40, halfW - 24, renderH - 60);

    targetCtx.fillStyle = '#00f0ff';
    targetCtx.font = 'bold 12px "Courier New", monospace';
    targetCtx.fillText('1. 3D INVERSE KINEMATICS SKELETON', 28, 62);

    // Draw 3D bones and joints
    const skCenterX = 16 + (halfW - 24) / 2;
    const skCenterY = 40 + (renderH - 60) / 2 + 35;
    const skScale = 3.8;

    targetCtx.lineWidth = 2.5;
    targetCtx.strokeStyle = '#00f0ff';

    for (const [from, to] of sk.bones) {
      const p1 = sk.joints[from];
      const p2 = sk.joints[to];
      if (p1 && p2) {
        targetCtx.beginPath();
        targetCtx.moveTo(skCenterX + p1[0] * skScale, skCenterY + p1[1] * skScale);
        targetCtx.lineTo(skCenterX + p2[0] * skScale, skCenterY + p2[1] * skScale);
        targetCtx.stroke();
      }
    }

    // Draw joint nodes
    for (const [name, pt] of Object.entries(sk.joints)) {
      const isHandle = sk.handles.includes(name);
      targetCtx.fillStyle = isHandle ? '#ff3c88' : '#ffffff';
      targetCtx.beginPath();
      targetCtx.arc(skCenterX + pt[0] * skScale, skCenterY + pt[1] * skScale, isHandle ? 4.5 : 2.5, 0, Math.PI * 2);
      targetCtx.fill();
    }

    // Right Pane: Rendered 24x38 Pixel Art Character
    targetCtx.fillStyle = '#11111a';
    targetCtx.fillRect(halfW + 8, 40, halfW - 24, renderH - 60);
    targetCtx.strokeStyle = '#333344';
    targetCtx.strokeRect(halfW + 8, 40, halfW - 24, renderH - 60);

    targetCtx.fillStyle = '#00ff88';
    targetCtx.fillText('2. FLAT-TONE PIXEL ART (24x38)', halfW + 20, 62);

    // Draw pixelated character scaled up 3.5x
    const pixelCanvasSize = 120 * 3.2;
    const pixelX = halfW + 8 + (halfW - 24 - pixelCanvasSize) / 2;
    const pixelY = 40 + (renderH - 60 - pixelCanvasSize) / 2;

    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(this.canvas, pixelX, pixelY, pixelCanvasSize, pixelCanvasSize);

    // Stats bar at bottom
    targetCtx.fillStyle = '#8888aa';
    targetCtx.font = '11px "Courier New", monospace';
    targetCtx.fillText(
      `Pixels: ${r.n} | Joints: ${Object.keys(sk.joints).length} | Bones: ${sk.bones.length} | Parts: ${parts.length} | Yaw: ${(this.yaw * (180 / Math.PI)).toFixed(0)}°`,
      28,
      renderH - 26
    );

    targetCtx.restore();
  }
}

