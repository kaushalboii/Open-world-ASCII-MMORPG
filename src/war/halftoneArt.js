/**
 * Analytical 3D Relief Heightfield Halftone ASCII Engine for IRONCROWN.
 * Renders biomechanically articulated Warhorses, Armored Knights, Infantry/Bow/Ram Regiments,
 * Castle Skylines, and Chiaroscuro House Lord Portraits with exact 11x20 pixel-aspect
 * compensation onto strict printable ASCII (" .,:;-=+*#%@") & 5 P3 Amber phosphor grades.
 */

import {
  GRADE_BRIGHT,
  GRADE_DIM,
  GRADE_GHOST,
  GRADE_LIT,
  GRADE_MIST,
  sanitizeGlyph,
} from '../engine/palette.js';

const RAMP = ' .,:;-=+*#%@';
const BODY_RAMP = '=+*#%@';
const CHAR_ASPECT = 1.82; // 11x20 CRT cell is ~1.82x taller than wide

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smax(a, b, k) {
  if (a < -10) return b;
  if (b < -10) return a;
  const h = clamp(0.5 + (0.5 * (a - b)) / k, 0.0, 1.0);
  return b * (1.0 - h) + a * h + k * h * (1.0 - h);
}

function segHeight(px, py, ax, ay, bx, by, ra, rb, depthBias = 0, swell = 1.0) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const len2 = bax * bax + bay * bay;
  const t = len2 > 1e-6 ? clamp((pax * bax + pay * bay) / len2, 0.0, 1.0) : 0.0;
  const cx = ax + bax * t;
  const cy = ay + bay * t;
  const dx = px - cx;
  const dy = py - cy;
  const dist2 = dx * dx + dy * dy;
  const r = lerp(ra, rb, t);
  const r2 = r * r;
  if (dist2 >= r2) return -99.0;
  return depthBias + Math.sqrt(Math.max(0.0, r2 - dist2)) * swell;
}

function boxHeight(px, py, cx, cy, hw, hh, depthBias = 0, bevel = 0.08) {
  const dx = Math.abs(px - cx) - hw;
  const dy = Math.abs(py - cy) - hh;
  if (dx > 0 || dy > 0) return -99.0;
  const edge = Math.min(-dx, -dy);
  return depthBias + Math.min(bevel, edge * 0.9 + 0.02);
}

function addSeg(cur, px, py, ax, ay, bx, by, ra, rb, k = 0.04, depthBias = 0, swell = 1.0) {
  const z = segHeight(px, py, ax, ay, bx, by, ra, rb, depthBias, swell);
  if (z < -10) return cur;
  if (cur < -10) return z;
  return smax(cur, z, k);
}

/**
 * Evaluate layered relief heightfield (far background limbs/mane/cloak vs near horse, armor & steel).
 * Tuned around a true Muybridge/Friesian stallion gallop silhouette so every limb, arched neck crest,
 * muzzle, ear, helm, cloak, and couched lance separates cleanly even at compact ASCII sizes.
 */
function evalHorseRelief(px, py, phase, opts = {}) {
  const p = phase * Math.PI * 2;
  const bounce = Math.sin(p) * 0.032;
  const pitch = Math.cos(p) * 0.04;
  const headNod = Math.sin(p + 0.5) * 0.03;
  const charging = Boolean(opts.charging);
  const includeRider = opts.includeRider !== false;
  const pad = opts.detailPad || 0.0;
  // Ensure even thin shins, lances & ears span >= 0.60 of a vertical row height (never dashed!)
  const minR = opts.minR || 0.055;

  const y = py - bounce;

  let zBack = -99.0;  // far-side legs, streaming mane, windblown cloak, tail
  let zHorse = -99.0; // core stallion chest, barrel, croup, arched neck, head, near legs
  let zArmor = -99.0; // saddle cloth, barding chest plate, knight torso/greave
  let zSteel = -99.0; // knight greathelm, raised lance/pennant, steel chamfron

  // 1. Sculpted Equine Barrel, Deep Chest Keel & Rounded Haunches
  zHorse = addSeg(zHorse, px, y, -0.60, 0.06 - pitch * 0.25, 0.34, 0.04 + pitch * 0.25, 0.26 + pad, 0.31 + pad, 0.06, 0.0, 1.18);
  zHorse = addSeg(zHorse, px, y, 0.28, -0.02 + pitch * 0.25, 0.56, 0.16 + pitch * 0.3, 0.30 + pad, 0.24 + pad, 0.07, 0.05, 1.22);
  zHorse = addSeg(zHorse, px, y, -0.84, 0.04 - pitch * 0.25, -0.46, 0.16 - pitch * 0.2, 0.26 + pad, 0.30 + pad, 0.07, 0.03, 1.18);

  // Ornamental Caparison / Saddle Blanket & Barding Chest Guard
  zArmor = addSeg(zArmor, px, y, -0.42, 0.22, 0.16, 0.22, 0.15 + pad * 0.5, 0.15 + pad * 0.5, 0.03, 0.11);
  zArmor = addSeg(zArmor, px, y, 0.44, 0.16, 0.58, -0.04, 0.14 + pad * 0.5, 0.12 + pad * 0.5, 0.03, 0.12);

  // 2. Proud High-Arched Stallion Neck + Clear Sky Gap Before Rider!
  const neckBX = 0.46;
  const neckBY = 0.22 + pitch * 0.25;
  const neckMX = 0.72;
  const neckMY = 0.68 + headNod * 0.4;
  const pollX = 0.90;
  const pollY = 0.98 + headNod;

  zHorse = addSeg(zHorse, px, y, neckBX, neckBY, neckMX, neckMY, 0.25 + pad, 0.175 + pad, 0.05, 0.04);
  zHorse = addSeg(zHorse, px, y, neckMX, neckMY, pollX, pollY, 0.175 + pad, 0.14 + pad, 0.04, 0.05);

  // Wind-swept mane locks flowing behind arched crest
  for (let m = 0; m < 4; m++) {
    const f = 0.26 + m * 0.22;
    const mx = lerp(neckBX, pollX, f) - 0.06;
    const my = lerp(neckBY, pollY, f) + 0.06;
    const flap = Math.sin(p * 2.0 + m * 1.1) * 0.04;
    zBack = addSeg(zBack, px, y, mx, my, mx - 0.22, my + 0.04 + flap, Math.max(minR, 0.075 + pad * 0.4), Math.max(minR * 0.7, 0.035), 0.03, -0.05);
  }

  // 3. Noble Down-Tucked Warhorse Head (sharp brow, curved nose, crisp jaw/muzzle, pricked ears)
  const noseX = charging ? 1.26 : 1.18;
  const noseY = charging ? 0.58 + headNod : 0.50 + headNod;
  zHorse = addSeg(zHorse, px, y, pollX, pollY + 0.01, noseX, noseY + 0.01, 0.15 + pad, 0.075 + pad, 0.04, 0.07);
  zHorse = addSeg(zHorse, px, y, pollX + 0.01, pollY - 0.07, pollX + 0.09, pollY - 0.15, 0.14 + pad, 0.10 + pad, 0.04, 0.09);
  zHorse = addSeg(zHorse, px, y, pollX + 0.07, pollY - 0.15, noseX - 0.04, noseY - 0.04, 0.088 + pad, 0.056 + pad, 0.03, 0.05);
  zSteel = addSeg(zSteel, px, y, pollX + 0.05, pollY + 0.04, noseX - 0.08, noseY + 0.04, Math.max(minR, 0.062), Math.max(minR * 0.85, 0.045), 0.02, 0.17);
  // Twin tall pricked ears clearly towering above poll
  zHorse = addSeg(zHorse, px, y, pollX - 0.01, pollY + 0.08, pollX + 0.07, pollY + 0.34, Math.max(minR, 0.058 + pad * 0.5), Math.max(minR * 0.75, 0.028), 0.02, 0.07);
  zBack = addSeg(zBack, px, y, pollX - 0.10, pollY + 0.08, pollX - 0.03, pollY + 0.31, Math.max(minR, 0.052 + pad * 0.4), Math.max(minR * 0.7, 0.026), 0.02, -0.04);

  const eyeCatch = Math.hypot(px - (pollX + 0.13), y - (pollY - 0.02)) < Math.max(minR * 1.1, 0.062);

  // 4. Streaming Dynamic Warhorse Tail
  const tw1 = Math.sin(p + 0.5) * 0.09;
  const tw2 = Math.cos(p - 0.4) * 0.11;
  zBack = addSeg(zBack, px, y, -0.86, 0.15 - pitch * 0.25, -1.26, 0.08 + tw1, 0.11 + pad * 0.6, Math.max(minR, 0.08), 0.04, -0.04);
  zBack = addSeg(zBack, px, y, -1.24, 0.08 + tw1, -1.64, -0.14 + tw2, Math.max(minR, 0.085), Math.max(minR * 0.8, 0.045), 0.03, -0.06);

  // 5. Four Widely Separated Articulated 3-Bone Gallop Legs (guaranteed continuous via minR!)
  const renderLeg = (hipX, hipY, phOff, biasAng, swingAmp, isFront, intoBack) => {
    const a = p + phOff;
    const uAng = Math.sin(a) * swingAmp + biasAng;
    const kneeBend = isFront
      ? 0.24 + Math.max(0.0, Math.sin(a + 1.0)) * 1.00
      : -0.26 - Math.max(0.0, Math.sin(a - 0.7)) * 0.88;
    const lAng = uAng + kneeBend;

    const uLen = 0.42;
    const lLen = 0.41;
    const kx = hipX + Math.sin(uAng) * uLen;
    const ky = hipY - Math.cos(uAng) * uLen;
    const fx = kx + Math.sin(lAng) * lLen;
    const fy = ky - Math.cos(lAng) * lLen;

    const bias = intoBack ? -0.05 : 0.11;
    const shinR = Math.max(minR * 1.1, 0.068 + pad * 0.8);
    const hoofR = Math.max(minR * 1.2, 0.075 + pad * 0.8);
    let target = intoBack ? zBack : zHorse;
    target = addSeg(target, px, y, hipX, hipY, kx, ky, (isFront ? 0.135 : 0.17) + pad, Math.max(minR * 1.25, 0.082 + pad), 0.04, bias);
    target = addSeg(target, px, y, kx, ky, fx, fy, Math.max(minR * 1.2, 0.078 + pad), shinR, 0.02, bias);
    target = addSeg(target, px, y, fx - 0.02, fy, fx + 0.08, fy - 0.04, hoofR, Math.max(minR, 0.062 + pad), 0.015, bias);
    if (intoBack) zBack = target;
    else zHorse = target;
  };

  renderLeg(0.42, -0.08 + pitch * 0.25, 0.0, 0.40, 0.72, true, false);
  renderLeg(0.35, -0.08 + pitch * 0.25, 2.25, 0.10, 0.68, true, true);
  renderLeg(-0.62, -0.07 - pitch * 0.2, 3.05, -0.40, 0.70, false, false);
  renderLeg(-0.68, -0.07 - pitch * 0.2, 5.20, -0.10, 0.66, false, true);

  // 6. Upright Armored Knight + Greathelm + Flowing Cloak + Angled Sky-Piercing War-Lance
  if (includeRider) {
    const lean = charging ? 0.12 : 0.06;
    const rHipX = -0.14;
    const rHipY = 0.36;
    const rShX = rHipX + lean;
    const rShY = 0.86;

    zArmor = addSeg(zArmor, px, y, rHipX, rHipY, rShX, rShY, 0.17 + pad, 0.21 + pad, 0.04, 0.14);
    zArmor = addSeg(zArmor, px, y, rHipX + 0.03, rHipY, rHipX + 0.16, 0.02, 0.115 + pad, 0.085 + pad, 0.02, 0.18);
    zArmor = addSeg(zArmor, px, y, rHipX + 0.16, 0.02, rHipX + 0.06, -0.24, 0.085 + pad, 0.068 + pad, 0.02, 0.18);
    zArmor = addSeg(zArmor, px, y, rShX - 0.02, rShY - 0.05, rShX + 0.18, rShY - 0.14, 0.13 + pad, 0.12 + pad, 0.02, 0.21);

    zSteel = addSeg(zSteel, px, y, rShX + 0.01, rShY + 0.14, rShX + 0.04, rShY + 0.32, 0.145 + pad, 0.135 + pad, 0.02, 0.21);
    const plume = Math.sin(p * 2.0) * 0.04;
    zBack = addSeg(zBack, px, y, rShX, rShY + 0.34, rShX - 0.28, rShY + 0.30 + plume, Math.max(minR, 0.065), Math.max(minR * 0.75, 0.025), 0.03, -0.02);

    const cw1 = Math.sin(p + 0.8) * 0.10;
    const cw2 = Math.cos(p - 0.4) * 0.12;
    zBack = addSeg(zBack, px, y, rShX - 0.08, rShY + 0.02, -0.74, 0.68 + cw1, 0.125 + pad, 0.165 + pad, 0.04, -0.04);
    zBack = addSeg(zBack, px, y, -0.72, 0.68 + cw1, -1.34, 0.50 + cw2, 0.155 + pad, Math.max(minR, 0.065), 0.04, -0.06);

    // War-Lance held diagonally back-to-up ABOVE the knight (clear of ears) + Couched Front Spear!
    const tipX = charging ? 0.24 : 0.40;
    const tipY = 1.48;
    const handX = rShX + 0.08;
    const handY = rShY - 0.14;
    zSteel = addSeg(zSteel, px, y, handX, handY, tipX, tipY, Math.max(minR * 0.85, 0.045), Math.max(minR * 0.8, 0.036), 0.01, 0.24);
    if (charging) {
      zSteel = addSeg(zSteel, px, y, 0.72, 0.19, 1.72, 0.23, Math.max(minR * 0.62, 0.028), Math.max(minR * 0.45, 0.018), 0.008, 0.24);
    }
    const bFlap = Math.sin(p * 2.0 + 0.4) * 0.05;
    const bx0 = lerp(handX, tipX, 0.78);
    const by0 = lerp(handY, tipY, 0.78);
    zArmor = addSeg(zArmor, px, y, bx0, by0, bx0 - 0.56, by0 - 0.05 + bFlap, Math.max(minR * 1.15, 0.095), Math.max(minR * 0.75, 0.030), 0.02, 0.16);
  }

  let z = -99.0;
  let layer = 0;
  if (zBack > z) { z = zBack; layer = 1; }
  if (zHorse > z) { z = zHorse; layer = 2; }
  if (zArmor > z) { z = zArmor; layer = 3; }
  if (zSteel > z) { z = zSteel; layer = 4; }
  return { z, layer, eyeCatch };
}

/**
 * Full-bleed Painterly Sky, Low Horizon Keep & Crisp Ground + 3D Halftone Horse Compositor.
 */
export function render3DHorseCanvas(cols, rows, phase, opts = {}) {
  const {
    scale = 1.0,
    offsetX = 0.0,
    offsetY = 0.0,
    withSkyBackdrop = true,
    backdropScroll = 0,
    seasonId = 'winter',
  } = opts;

  const out = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [' ', GRADE_GHOST]));
  const halfW = cols * 0.5;
  const halfH = rows * 0.52;
  const unitPerCol = Math.max(3.65 / (cols * scale), 2.55 / (rows * CHAR_ASPECT * scale));
  const eps = unitPerCol * 0.80;
  const detailPad = cols < 28 ? 0.036 : cols < 48 ? 0.020 : 0.0;
  const minR = unitPerCol * CHAR_ASPECT * 0.58;
  const evalOpts = { ...opts, detailPad, minR };

  const kx = 0.52, ky = 0.68, kz = 0.52;

  for (let r = 0; r < rows; r++) {
    const wy = (halfH - r) * CHAR_ASPECT * unitPerCol + offsetY;
    for (let c = 0; c < cols; c++) {
      const wx = (c - halfW) * unitPerCol + offsetX;
      const center = evalHorseRelief(wx, wy, phase, evalOpts);

      if (center.z > -10) {
        const rawR = evalHorseRelief(wx + eps, wy, phase, evalOpts).z;
        const rawL = evalHorseRelief(wx - eps, wy, phase, evalOpts).z;
        const rawU = evalHorseRelief(wx, wy + eps, phase, evalOpts).z;
        const rawD = evalHorseRelief(wx, wy - eps, phase, evalOpts).z;
        const zR = rawR > -10 ? rawR : Math.max(-0.08, center.z - 0.14);
        const zL = rawL > -10 ? rawL : Math.max(-0.08, center.z - 0.14);
        const zU = rawU > -10 ? rawU : Math.max(-0.08, center.z - 0.14);
        const zD = rawD > -10 ? rawD : Math.max(-0.08, center.z - 0.14);

        const dzdx = (zR - zL) / (2 * eps);
        const dzdy = (zU - zD) / (2 * eps);
        const nx = -dzdx, ny = -dzdy, nz = 1.0;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        const ux = nx / nLen, uy = ny / nLen, uz = nz / nLen;

        const diff = Math.max(0, ux * kx + uy * ky + uz * kz);
        const rim = Math.pow(clamp(1.0 - uz, 0.0, 1.0), 1.3);
        let lum = 0.30 + diff * 0.50 + rim * 0.22;
        if (center.layer === 1) lum *= 0.52;
        if (center.layer === 3) lum = clamp(lum * 1.12 + 0.08, 0, 1);
        if (center.layer === 4) lum = clamp(0.76 + diff * 0.24, 0, 1);
        if (center.eyeCatch) lum = 0.99;
        lum = clamp(lum, 0.06, 0.99);

        const idx = clamp(Math.round(lum * (BODY_RAMP.length - 1)), 0, BODY_RAMP.length - 1);
        const ch = BODY_RAMP[idx];
        const grade =
          center.layer === 1
            ? lum > 0.44 ? GRADE_DIM : GRADE_MIST
            : lum > 0.84 ? GRADE_BRIGHT : lum > 0.50 ? GRADE_LIT : GRADE_DIM;
        out[r][c] = [ch, grade];
      } else if (withSkyBackdrop) {
        const rx = c + backdropScroll * 0.45;
        const groundY = Math.floor(rows * 0.88);
        const ridge = rows * 0.68 - Math.sin(rx * 0.07) * 1.6 - Math.cos(rx * 0.17) * 0.8;
        const keepMaxCol = Math.floor(cols * 0.16);
        const inLeftKeep = c >= 2 && c <= keepMaxCol && r >= Math.floor(rows * 0.46) && r < groundY;
        const keepCrown = inLeftKeep && (r > Math.floor(rows * 0.50) || c % 2 === 0);

        if (r >= groundY) {
          const castShadow = wx > -1.0 && wx < 1.0 && wy < -0.5;
          if (castShadow) {
            out[r][c] = ['_', GRADE_GHOST];
          } else {
            const roadMix = ((c + Math.floor(backdropScroll * 1.5) + r * 3) % 6 === 0);
            out[r][c] = [roadMix ? '=' : '-', GRADE_GHOST];
          }
        } else if (keepCrown) {
          const torchGlow = c === Math.floor(keepMaxCol * 0.55) && r === Math.floor(rows * 0.49);
          out[r][c] = torchGlow ? ['*', GRADE_LIT] : [c % 3 === 0 ? ':' : ';', GRADE_GHOST];
        } else if (r >= Math.floor(ridge) && r < groundY) {
          out[r][c] = [(c + r) % 7 === 0 ? '.' : ' ', GRADE_GHOST];
        } else {
          const highSky = Math.max(0, 1.0 - r / (rows * 0.58));
          const cloudA = Math.sin(rx * 0.055 + r * 0.30) * 0.5 + 0.5;
          const cloudB = Math.cos(rx * 0.11 - r * 0.40) * 0.5 + 0.5;
          const sky = clamp((cloudA * 0.16 + cloudB * 0.12) * highSky, 0.0, 0.34);
          const snow = seasonId === 'winter' && ((c * 19 + Math.floor(backdropScroll * 1.3) + r * 31) % 79 === 0);
          if (snow) out[r][c] = ['*', GRADE_DIM];
          else if (sky > 0.04) {
            const idx = clamp(Math.floor(sky * (RAMP.length - 1)), 1, 5);
            out[r][c] = [RAMP[idx], GRADE_GHOST];
          }
        }
      }
    }
  }
  return out;
}

// ============================================================================
// 2. ANALYTICAL 3D HALFTONE BATTLEFIELD UNITS + CRISP TACTICAL SILHOUETTE LINES
// ============================================================================
function evalInfantryRelief(px, py, type, variant = 0) {
  let z = -99.0;
  let layer = 2; // 2=cloth/timber, 3=shield/armor, 4=blade/iron

  if (type === 'ram') {
    const thrust = variant === 1 ? 0.18 : 0.0;
    const x = px - thrust;
    const roofL = segHeight(x, py, -1.15, 0.15, 0.0, 0.62, 0.12, 0.12, 0.05);
    const roofR = segHeight(x, py, 0.0, 0.62, 1.15, 0.15, 0.12, 0.12, 0.05);
    const timberBox = boxHeight(x, py, 0.0, 0.02, 1.05, 0.25, 0.0, 0.14);
    z = smax(timberBox, smax(roofL, roofR, 0.04), 0.04);
    const ramHead = segHeight(x, py, -0.5, -0.05, 1.48, -0.05, 0.14, 0.19, 0.16);
    if (ramHead > z) { z = ramHead; layer = 4; }
    for (const wx of [-0.72, 0.72]) {
      const wh = Math.sqrt(Math.max(-1, 0.24 * 0.24 - ((x - wx) ** 2 + (py + 0.38) ** 2)));
      if (wh > 0 && wh + 0.20 > z) { z = wh + 0.20; layer = 3; }
    }
    return { z, layer };
  }

  const offsets = type === 'spear' ? [-0.46, 0.18] : [-0.42, 0.28];
  for (let i = 0; i < offsets.length; i++) {
    const ox = offsets[i];
    const ux = px - ox;
    const uy = py;
    z = addSeg(z, ux, uy, 0.0, 0.50, 0.0, 0.56, 0.16, 0.14, 0.03, 0.05);
    z = addSeg(z, ux, uy, 0.0, 0.38, 0.0, -0.04, 0.22, 0.16, 0.04, 0.02);
    z = addSeg(z, ux, uy, -0.09, -0.04, -0.15, -0.55, 0.105, 0.08, 0.02, 0.0);
    z = addSeg(z, ux, uy, 0.09, -0.04, 0.15, -0.55, 0.105, 0.08, 0.02, 0.0);

    if (type === 'spear') {
      const br = variant === 1;
      const sh = boxHeight(ux, uy, br ? 0.20 : 0.14, 0.14, 0.17, 0.35, 0.18, 0.14);
      if (sh > z) { z = sh; layer = 3; }
      const pike = segHeight(ux, uy, -0.16, 0.05, 0.80, br ? 0.44 : 0.74, 0.055, 0.035, 0.22);
      if (pike > z) { z = pike; layer = 4; }
    } else if (type === 'bow') {
      const draw = variant === 1 ? 0.08 : 0.0;
      const bowT = segHeight(ux, uy, 0.20 - draw, 0.58, 0.36, 0.16, 0.055, 0.050, 0.18);
      const bowB = segHeight(ux, uy, 0.36, 0.16, 0.20 - draw, -0.24, 0.050, 0.055, 0.18);
      const arrow = segHeight(ux, uy, 0.02, 0.18, 0.58, 0.18, 0.040, 0.025, 0.20);
      const weapon = Math.max(bowT, bowB, arrow);
      if (weapon > z) { z = weapon; layer = 4; }
    } else {
      const swing = variant === 1;
      const sh = segHeight(ux, uy, -0.12, 0.04, -0.14, 0.34, 0.16, 0.16, 0.16);
      if (sh > z) { z = sh; layer = 3; }
      const sw = segHeight(ux, uy, 0.12, 0.20, swing ? 0.64 : 0.36, swing ? 0.22 : 0.70, 0.06, 0.032, 0.22);
      if (sw > z) { z = sw; layer = 4; }
    }
  }
  return { z, layer };
}

export function render3DBattleUnit(type, variant = 0, cols = 15, rows = 6) {
  const out = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [' ', GRADE_GHOST]));
  const halfW = cols * 0.5;
  const halfH = rows * 0.5;
  const unitPerCol = (type === 'ram' ? 3.2 : 2.35) / cols;
  const eps = unitPerCol * 0.8;
  const kx = 0.5, ky = 0.72, kz = 0.48;

  for (let r = 0; r < rows; r++) {
    const wy = (halfH - r) * CHAR_ASPECT * unitPerCol * (type === 'ram' ? 0.78 : 0.86);
    for (let c = 0; c < cols; c++) {
      const wx = (c - halfW) * unitPerCol;
      const cen = evalInfantryRelief(wx, wy, type, variant);
      if (cen.z > -10) {
        const rR = evalInfantryRelief(wx + eps, wy, type, variant).z;
        const rL = evalInfantryRelief(wx - eps, wy, type, variant).z;
        const rU = evalInfantryRelief(wx, wy + eps, type, variant).z;
        const rD = evalInfantryRelief(wx, wy - eps, type, variant).z;
        const zR = rR > -10 ? rR : Math.max(-0.06, cen.z - 0.12);
        const zL = rL > -10 ? rL : Math.max(-0.06, cen.z - 0.12);
        const zU = rU > -10 ? rU : Math.max(-0.06, cen.z - 0.12);
        const zD = rD > -10 ? rD : Math.max(-0.06, cen.z - 0.12);
        const nx = -(zR - zL) / (2 * eps);
        const ny = -(zU - zD) / (2 * eps);
        const nz = 1.0;
        const ln = Math.hypot(nx, ny, nz) || 1;
        const diff = Math.max(0, (nx * kx + ny * ky + nz * kz) / ln);
        let lum = clamp(0.28 + diff * 0.56, 0.22, 0.98);
        if (cen.layer === 3) lum = clamp(lum * 1.1 + 0.08, 0, 1);
        if (cen.layer === 4) lum = clamp(0.78 + diff * 0.22, 0, 1);
        const idx = clamp(Math.round(lum * (BODY_RAMP.length - 1)), 0, BODY_RAMP.length - 1);
        out[r][c] = [BODY_RAMP[idx], lum > 0.84 ? GRADE_BRIGHT : lum > 0.48 ? GRADE_LIT : GRADE_DIM];
      }
    }
  }
  // Composite crisp weapon steel highlights so spear/bow/guard/ram read at first glance!
  if (type === 'spear' && rows >= 6 && cols >= 15) {
    const pikes = variant === 1 ? [[2, 9, '='], [2, 10, '='], [2, 11, '>'], [3, 8, '-'], [3, 12, '>']] : [[0, 6, '^'], [0, 10, '^'], [1, 6, '|'], [1, 10, '|'], [2, 7, '/'], [2, 11, '/']];
    for (const [rr, cc, ch] of pikes) out[rr][cc] = [ch, GRADE_BRIGHT];
  } else if (type === 'bow' && rows >= 6 && cols >= 15) {
    const arcs = variant === 1
      ? [[1, 6, ')'], [2, 7, '|'], [2, 8, '>'], [3, 6, ')'], [1, 11, ')'], [2, 12, '>'], [3, 11, ')']]
      : [[1, 6, ')'], [2, 6, '|'], [3, 6, ')'], [1, 11, ')'], [2, 11, '|'], [3, 11, ')']];
    for (const [rr, cc, ch] of arcs) out[rr][cc] = [ch, GRADE_BRIGHT];
  } else if (type === 'guard' && rows >= 6 && cols >= 15) {
    const blades = variant === 1
      ? [[2, 7, '-'], [2, 8, '>'], [2, 12, '='], [2, 13, '>'], [3, 5, '['], [3, 10, '[']]
      : [[0, 7, '/'], [0, 12, '/'], [1, 6, '/'], [1, 11, '/'], [2, 5, '|'], [2, 10, '|']];
    for (const [rr, cc, ch] of blades) out[rr][cc] = [ch, GRADE_BRIGHT];
  } else if (type === 'ram' && rows >= 6 && cols >= 18) {
    out[3][14] = ['=', GRADE_BRIGHT];
    out[3][15] = ['>', GRADE_BRIGHT];
  }
  return out;
}

// ============================================================================
// 3. ANALYTICAL 3D RELIEF HOUSE LORD PORTRAITS (Chiaroscuro Noble Busts!)
// ============================================================================
function evalLordBustRelief(px, py, trait = 'thorne') {
  let zHead = -99.0;
  // Cranium, cheek plane, strong jawline, aquiline nose bridge, muscular neck & wide pauldrons
  zHead = addSeg(zHead, px, py, 0.0, 0.28, 0.0, 0.02, 0.37, 0.35, 0.06, 0.05);
  zHead = addSeg(zHead, px, py, 0.0, 0.04, 0.0, -0.26, 0.33, 0.21, 0.06, 0.06);
  // Heavy brow ridge
  zHead = addSeg(zHead, px, py, -0.22, 0.20, 0.22, 0.20, 0.085, 0.085, 0.03, 0.16);
  // Aquiline nose bridge
  zHead = addSeg(zHead, px, py, 0.0, 0.21, 0.0, -0.04, 0.062, 0.055, 0.02, 0.20);
  // Collar & broad cloaked noble shoulders
  zHead = addSeg(zHead, px, py, 0.0, -0.22, 0.0, -0.52, 0.21, 0.24, 0.05, -0.02);
  zHead = addSeg(zHead, px, py, -0.82, -0.68, 0.82, -0.68, 0.34, 0.34, 0.08, 0.0);

  if (trait === 'dray') {
    // High Stag-Antler Crown + Jagged Steel Gorget
    zHead = addSeg(zHead, px, py, -0.34, 0.42, 0.34, 0.42, 0.10, 0.10, 0.03, 0.14);
    zHead = addSeg(zHead, px, py, -0.26, 0.44, -0.54, 0.90, 0.085, 0.030, 0.03, 0.12);
    zHead = addSeg(zHead, px, py, 0.26, 0.44, 0.54, 0.90, 0.085, 0.030, 0.03, 0.12);
  } else if (trait === 'council') {
    // Draped Maester Hood + Heavy Chain Collar
    zHead = addSeg(zHead, px, py, 0.0, 0.72, -0.40, 0.06, 0.19, 0.16, 0.06, 0.09);
    zHead = addSeg(zHead, px, py, 0.0, 0.72, 0.40, 0.06, 0.19, 0.16, 0.06, 0.09);
  } else if (trait === 'vance') {
    // Noble Winged Tiara / High Braided Coif
    zHead = addSeg(zHead, px, py, 0.0, 0.42, 0.0, 0.78, 0.27, 0.10, 0.05, 0.11);
  } else if (trait === 'locke') {
    // Flat Steel Visored Bar-Helm + High Pauldrons
    zHead = addSeg(zHead, px, py, -0.35, 0.35, 0.35, 0.35, 0.08, 0.08, 0.02, 0.14);
    zHead = addSeg(zHead, px, py, -0.56, -0.42, 0.56, -0.42, 0.25, 0.25, 0.06, 0.09);
  } else if (trait === 'brack') {
    // Thick Beard & Heavy Plate Gorget
    zHead = addSeg(zHead, px, py, 0.0, -0.10, 0.0, -0.54, 0.25, 0.15, 0.04, 0.11);
  } else {
    // Lord Thorne: Wolf-Pelt Cloak Collar + Close-Cropped Beard
    zHead = addSeg(zHead, px, py, -0.58, -0.40, 0.58, -0.40, 0.26, 0.26, 0.06, 0.08);
    zHead = addSeg(zHead, px, py, 0.0, -0.12, 0.0, -0.42, 0.21, 0.13, 0.04, 0.10);
  }

  // Deep-set eye hollows + sharp catchlight pupils (scaled for 28-col grid!)
  const eyeD = Math.min(Math.hypot(px + 0.14, py - 0.12), Math.hypot(px - 0.14, py - 0.12));
  if (eyeD < 0.09) zHead -= (0.09 - eyeD) * 2.2;
  return { z: zHead, isEye: eyeD < 0.058 };
}

export function render3DLordPortrait(trait, cols = 28, rows = 14) {
  const out = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [' ', GRADE_GHOST]));
  const unitPerCol = Math.max(1.75 / cols, 1.75 / (rows * CHAR_ASPECT));
  const eps = unitPerCol * 0.8;
  const kx = -0.62, ky = 0.50, kz = 0.60;

  for (let r = 0; r < rows; r++) {
    const wy = (rows * 0.52 - r) * CHAR_ASPECT * unitPerCol;
    for (let c = 0; c < cols; c++) {
      const wx = (c - cols * 0.5) * unitPerCol;
      const cen = evalLordBustRelief(wx, wy, trait);
      if (cen.z > -10) {
        const rawR = evalLordBustRelief(wx + eps, wy, trait).z;
        const rawL = evalLordBustRelief(wx - eps, wy, trait).z;
        const rawU = evalLordBustRelief(wx, wy + eps, trait).z;
        const rawD = evalLordBustRelief(wx, wy - eps, trait).z;
        const zR = rawR > -10 ? rawR : Math.max(-0.06, cen.z - 0.12);
        const zL = rawL > -10 ? rawL : Math.max(-0.06, cen.z - 0.12);
        const zU = rawU > -10 ? rawU : Math.max(-0.06, cen.z - 0.12);
        const zD = rawD > -10 ? rawD : Math.max(-0.06, cen.z - 0.12);
        const nx = -(zR - zL) / (2 * eps);
        const ny = -(zU - zD) / (2 * eps);
        const nz = 1.0;
        const ln = Math.hypot(nx, ny, nz) || 1;
        const diff = Math.max(0, (nx * kx + ny * ky + nz * kz) / ln);
        const rim = Math.pow(clamp(1.0 - nz / ln, 0, 1), 1.5);
        let lum = clamp(0.18 + diff * 0.62 + rim * 0.24, 0.08, 0.98);
        if (cen.isEye) lum = 0.99;
        const idx = clamp(Math.round(lum * (BODY_RAMP.length - 1)), 0, BODY_RAMP.length - 1);
        out[r][c] = [BODY_RAMP[idx], lum > 0.82 ? GRADE_BRIGHT : lum > 0.44 ? GRADE_LIT : GRADE_DIM];
      } else {
        const haze = Math.max(0, 0.22 - Math.hypot(wx * 0.45, wy * 0.45) * 0.14);
        if (haze > 0.09) out[r][c] = ['.', GRADE_GHOST];
      }
    }
  }
  return out;
}

// ============================================================================
// 4. BAKED ZERO-LAG 60 FPS ANIMATION CACHES
// ============================================================================
const MIRROR_CHAR = {
  '/': '\\',
  '\\': '/',
  '(': ')',
  ')': '(',
  '<': '>',
  '>': '<',
  '[': ']',
  ']': '[',
};

function mirrorCellGrid(cellGrid) {
  return cellGrid.map((row) =>
    row
      .slice()
      .reverse()
      .map(([ch, g]) => [MIRROR_CHAR[ch] || ch, g])
  );
}

const BAKED = {
  ready: false,
  titleFrames: [],       // 8 frames of 64x30 full-bleed Hero Charger & Highcrown Horizon
  campaignRight: [],     // 8 frames of 46x13 Shaded Gallop Horse
  campaignLeft: [],
  campaignIdleR: null,
  campaignIdleL: null,
  battleHorseRight: [],  // 6 frames of 26x10 Battle Cavalry
  battleHorseLeft: [],
  battleChargeRight: null,
  battleChargeLeft: null,
  battleUnitsR: {},      // guard, spear, bow, ram
  battleUnitsL: {},
  portraits: {},
};

export function ensureHalftoneCache() {
  if (BAKED.ready) return BAKED;
  BAKED.ready = true;

  // 1) Pre-bake 8 Title Hero Panorama frames (64 cols x 30 rows)
  for (let i = 0; i < 8; i++) {
    BAKED.titleFrames.push(
      render3DHorseCanvas(64, 30, i / 8, {
        scale: 0.94,
        offsetX: 0.02,
        offsetY: 0.04,
        withSkyBackdrop: true,
        backdropScroll: i * 3,
        charging: true,
      })
    );
  }

  // 2) Pre-bake 8 Campaign Warhorse frames (46 cols x 13 rows -> plenty of leg clearance!)
  for (let i = 0; i < 8; i++) {
    const fr = render3DHorseCanvas(46, 13, i / 8, {
      scale: 0.94,
      offsetX: -0.02,
      offsetY: 0.08,
      withSkyBackdrop: false,
      charging: true,
    });
    BAKED.campaignRight.push(fr);
    BAKED.campaignLeft.push(mirrorCellGrid(fr));
  }
  BAKED.campaignIdleR = render3DHorseCanvas(46, 13, 0.15, {
    scale: 0.94,
    offsetX: -0.02,
    offsetY: 0.08,
    withSkyBackdrop: false,
    charging: false,
  });
  BAKED.campaignIdleL = mirrorCellGrid(BAKED.campaignIdleR);

  // 3) Pre-bake 6 Battle Cavalry Destriers (26x10 -> crystal clear galloping legs + rider + lance)
  for (let i = 0; i < 6; i++) {
    const br = render3DHorseCanvas(26, 10, i / 6, {
      scale: 0.92,
      offsetX: -0.02,
      offsetY: 0.08,
      withSkyBackdrop: false,
      charging: false,
    });
    BAKED.battleHorseRight.push(br);
    BAKED.battleHorseLeft.push(mirrorCellGrid(br));
  }
  BAKED.battleChargeRight = render3DHorseCanvas(26, 10, 0.02, {
    scale: 0.92,
    offsetX: 0.0,
    offsetY: 0.14,
    withSkyBackdrop: false,
    charging: true,
  });
  BAKED.battleChargeLeft = mirrorCellGrid(BAKED.battleChargeRight);

  // 4) Pre-bake Battle Infantry, Spears, Bows & Ram in 3D Relief Halftone!
  for (const t of ['guard', 'spear', 'bow', 'ram']) {
    const cols = t === 'ram' ? 18 : 15;
    const rows = t === 'ram' ? 6 : 6;
    const f0 = render3DBattleUnit(t, 0, cols, rows);
    const f1 = render3DBattleUnit(t, 1, cols, rows);
    BAKED.battleUnitsR[t] = [f0, f1];
    BAKED.battleUnitsL[t] = [mirrorCellGrid(f0), mirrorCellGrid(f1)];
  }

  // 5) 6 House Lord & Advisor Chiaroscuro Portraits (28x14)
  for (const key of ['thorne', 'locke', 'brack', 'vance', 'dray', 'council']) {
    BAKED.portraits[key] = render3DLordPortrait(key, 28, 14);
  }
  return BAKED;
}

export function stampCellGrid(buf, x, y, cellGrid, bounds = null, gradeBoost = 0) {
  const rows = buf.length;
  const cols = rows > 0 ? buf[0].length : 0;
  const x0 = bounds ? bounds.x0 : 0;
  const y0 = bounds ? bounds.y0 : 0;
  const x1 = bounds ? bounds.x1 : cols - 1;
  const y1 = bounds ? bounds.y1 : rows - 1;

  for (let r = 0; r < cellGrid.length; r++) {
    const ty = y + r;
    if (ty < y0 || ty > y1) continue;
    const row = cellGrid[r];
    for (let c = 0; c < row.length; c++) {
      const tx = x + c;
      if (tx < x0 || tx > x1) continue;
      const [ch, g] = row[c];
      if (ch === ' ') continue;
      const ng = clamp(g + gradeBoost, GRADE_GHOST, GRADE_BRIGHT);
      buf[ty][tx] = [sanitizeGlyph(ch), ng];
    }
  }
}

export function getBakedTitleHero(clock) {
  const cache = ensureHalftoneCache();
  const idx = Math.floor(clock * 10) % cache.titleFrames.length;
  return cache.titleFrames[idx];
}

export function getBakedCampaignHorse(clock, isGalloping, facingRight) {
  const cache = ensureHalftoneCache();
  if (!isGalloping) {
    return facingRight ? cache.campaignIdleR : cache.campaignIdleL;
  }
  const idx = Math.floor(clock * 12) % cache.campaignRight.length;
  return facingRight ? cache.campaignRight[idx] : cache.campaignLeft[idx];
}

export function getBakedBattleSprite(squad, clock, pose = 'idle') {
  const cache = ensureHalftoneCache();
  const right = (squad.facing ?? (squad.side === 'attacker' ? 1 : -1)) >= 0;
  if (squad.type === 'horse') {
    const grid =
      pose === 'charge'
        ? right ? cache.battleChargeRight : cache.battleChargeLeft
        : (right ? cache.battleHorseRight : cache.battleHorseLeft)[Math.floor(clock * 10 + squad.slot) % cache.battleHorseRight.length];
    return { grid, halfW: 13, halfH: 5 };
  }
  const key = cache.battleUnitsR[squad.type] ? squad.type : 'guard';
  const active =
    squad.type === 'spear'
      ? squad.braced ? 1 : 0
      : pose === 'attack' || pose === 'volley' || Math.floor(clock * 4 + squad.slot) % 2 === 1
        ? 1
        : 0;
  const grid = (right ? cache.battleUnitsR[key] : cache.battleUnitsL[key])[active];
  return {
    grid,
    halfW: Math.floor(grid[0].length / 2),
    halfH: Math.floor(grid.length / 2),
  };
}

const STEED_PANORAMA_BY_SEASON = {};

export function getBakedSteedPanorama(clock, seasonId = 'winter') {
  let frames = STEED_PANORAMA_BY_SEASON[seasonId];
  if (!frames) {
    frames = [];
    for (let i = 0; i < 10; i++) {
      frames.push(
        render3DHorseCanvas(98, 27, i / 10, {
          scale: 0.94,
          offsetX: 0.02,
          offsetY: 0.04,
          withSkyBackdrop: true,
          backdropScroll: i * 4,
          seasonId,
          charging: true,
        })
      );
    }
    STEED_PANORAMA_BY_SEASON[seasonId] = frames;
  }
  const idx = Math.floor(clock * 11) % frames.length;
  return frames[idx];
}

export function getBakedPortrait(key) {
  const cache = ensureHalftoneCache();
  return cache.portraits[key] || cache.portraits.thorne;
}
