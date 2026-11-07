// The stance acts start from. A pose only says what differs from standing easy (STAND in rig.js), in screen terms, px from
// the feet, y negative up. Give the hands and feet; the skeleton works out the rest.
//   x, y       where the feet are, from the effect's origin
//   crouch     hips lowered; lean  the spine bent forward (+) or back (-); hx, hy  the head rolled, nodded
//   fx, fy, fz the near (right) hand; bx, by, bz  the far (left) hand; ffx, ffy  the near foot; fbx, fby  the far foot
//   turn       how far the chest faces us, in radians (it follows the hands if you leave it out); yaw  the whole body turned
//              about its feet (0 faces right, pi faces left, in between towards us; a spin is really a spin)
//   twist      extra chest turn; armsFront  the far hand comes round in front of the chest
//   weapon, sa what the near hand holds and its angle on screen (radians, 0 points forward); two  both hands on it
//   wl, wz     foreshorten the weapon towards (or, wz -1, away from) the viewer: wl is its length on screen, 1 is full
//   pull, nocked  a bow drawn to the far hand, an arrow on the string
//   offWeapon, sb  a weapon in the far hand and its angle
//   toeF, toeB up on the toes; ghost  leave after-images

export const READY = { crouch: 3, fx: 11, fy: -21, bx: 9, by: -21, ffx: 7, fbx: -7 };

// 1. Idle Breathing Animation (Subtle bobbing & chest sway)
export const ANIM_IDLE = [
  { ...READY, crouch: 2.0, lean: 0.0, fx: 10, fy: -20, bx: 8, by: -20, ffx: 6, fbx: -6 },
  { ...READY, crouch: 2.8, lean: 0.5, fx: 11, fy: -19, bx: 9, by: -19, ffx: 6, fbx: -6 },
  { ...READY, crouch: 3.5, lean: 1.0, fx: 11, fy: -18, bx: 9, by: -18, ffx: 6, fbx: -6 },
  { ...READY, crouch: 2.8, lean: 0.5, fx: 10, fy: -19, bx: 8, by: -19, ffx: 6, fbx: -6 },
];

// 2. 6-Frame Athletic Sprint Run Cycle
export const ANIM_RUN = [
  // Frame 0: Right foot forward strike, left foot trailing, lean in
  { ...READY, lean: 6, crouch: 2, ffx: 9, ffy: -1, fbx: -9, fby: -2, toeB: true, fx: -7, fy: -16, bx: 9, by: -20 },
  // Frame 1: Compression / down
  { ...READY, lean: 5, crouch: 4, ffx: 5, ffy: 0, fbx: -4, fby: -4, fx: -2, fy: -18, bx: 5, by: -20 },
  // Frame 2: Passing position
  { ...READY, lean: 4, crouch: 2, ffx: 0, ffy: -3, fbx: 2, fby: -1, fx: 4, fy: -20, bx: 0, by: -18 },
  // Frame 3: Left foot forward strike, right foot trailing
  { ...READY, lean: 6, crouch: 2, ffx: -9, ffy: -2, toeF: true, fbx: 9, fby: -1, fx: 9, fy: -20, bx: -7, by: -16 },
  // Frame 4: Compression opposite
  { ...READY, lean: 5, crouch: 4, ffx: -4, ffy: -4, fbx: 5, fby: 0, fx: 5, fy: -20, bx: -2, by: -18 },
  // Frame 5: Passing position opposite
  { ...READY, lean: 4, crouch: 2, ffx: 2, ffy: -1, fbx: 0, fby: -3, fx: 0, fy: -18, bx: 4, by: -20 },
];

// 3. Jump Animation (Ascent, Apex, Descent)
export const ANIM_JUMP = [
  // Launch / Ascent: Legs tucking, arms reaching
  { ...READY, lean: -2, crouch: 0, ffx: 4, ffy: -6, fbx: -3, fby: -7, fx: 7, fy: -26, bx: -5, by: -24 },
  // Apex: Full tuck
  { ...READY, lean: 0, crouch: 1, ffx: 5, ffy: -8, fbx: -4, fby: -9, fx: 9, fy: -25, bx: -6, by: -23 },
  // Descent: Feet reaching down for landing
  { ...READY, lean: 3, crouch: 1, ffx: 7, ffy: -2, fbx: -6, fby: -3, fx: 11, fy: -18, bx: -7, by: -18 },
];

// 4. Straight Punch Animation (Matches Sprite Fusion AI Animation Prompt: "Straight punch animation")
// Driving straight right fist forward, left fist chambered at ribs, strong forward martial stance
export const ANIM_STRAIGHT_PUNCH = [
  // Frame 0: Windup / Chamber (pull right fist back to ear/chest, drop hips)
  { ...READY, lean: -1, crouch: 4, fx: 5, fy: -20, bx: 4, by: -21, ffx: 7, fbx: -7 },
  // Frame 1: Thrust Drive (right fist accelerating forward, body snapping)
  { ...READY, lean: 4, crouch: 3, twist: 2.0, fx: 13, fy: -21, bx: 0, by: -20, ffx: 9, ffy: 0, fbx: -8, fby: -1, toeB: true },
  // Frame 2: Max Impact / Full Extension (straight punch lock, cyan energy knuckles, rear foot pushed off)
  { ...READY, lean: 7, crouch: 3, twist: 3.5, fx: 18, fy: -22, fz: 4, bx: -5, by: -19, bz: -2, ffx: 10, ffy: 0, fbx: -10, fby: -1, toeB: true },
  // Frame 3: Impact Hold & Follow-through
  { ...READY, lean: 6, crouch: 3, twist: 3.0, fx: 17, fy: -22, fz: 3, bx: -4, by: -19, bz: -2, ffx: 10, ffy: 0, fbx: -9, fby: -1, toeB: true },
  // Frame 4: Recovery back to stance
  { ...READY, lean: 2, crouch: 3, twist: 1.0, fx: 12, fy: -21, bx: 6, by: -20, ffx: 8, fbx: -7 },
];
