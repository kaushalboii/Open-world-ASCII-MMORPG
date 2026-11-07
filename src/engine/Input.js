// Comprehensive Input controller for Tiny Glyphs
// Supports keyboard, mouse aiming, and key state buffering

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      slash: false,
      dash: false,
      block: false,
      restart: false
    };

    // Edge-triggered keypress events (single press detection)
    this.justPressed = {
      slash: false,
      dash: false,
      restart: false,
      mute: false
    };

    this.mouse = {
      x: 0,
      y: 0,
      down: false,
      rightDown: false,
      worldX: 0,
      worldY: 0
    };

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent default scrolling for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'Space':
        case 'KeyJ':
          if (!this.keys.slash) this.justPressed.slash = true;
          this.keys.slash = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
          if (!this.keys.dash) this.justPressed.dash = true;
          this.keys.dash = true;
          break;
        case 'KeyQ':
        case 'KeyE':
          this.keys.block = true;
          break;
        case 'KeyR':
          if (!this.keys.restart) this.justPressed.restart = true;
          this.keys.restart = true;
          break;
        case 'KeyM':
          this.justPressed.mute = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'Space':
        case 'KeyJ':
          this.keys.slash = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyK':
          this.keys.dash = false;
          break;
        case 'KeyQ':
        case 'KeyE':
          this.keys.block = false;
          break;
        case 'KeyR':
          this.keys.restart = false;
          break;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.justPressed.slash = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.mouse.rightDown = true;
        this.justPressed.dash = true;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Clear edge-triggered single press flags at end of frame
  update() {
    this.justPressed.slash = false;
    this.justPressed.dash = false;
    this.justPressed.restart = false;
    this.justPressed.mute = false;
  }

  getMovementVector() {
    let dx = 0;
    let dy = 0;

    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const invSqrt2 = 0.70710678;
      dx *= invSqrt2;
      dy *= invSqrt2;
    }

    return { dx, dy };
  }
}

