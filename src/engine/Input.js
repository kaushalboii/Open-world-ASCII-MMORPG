// Comprehensive Input controller for Tiny Glyphs - PixelFX Edition
// Supports keyboard, mouse, and mobile touch pads with single press buffering

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    this.activeKeys = new Set();
    this.justPressed = new Set();

    this.mouse = {
      x: 0,
      y: 0,
      down: false,
    };

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scroll on game controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (!this.activeKeys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.activeKeys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.activeKeys.delete(e.code);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.justPressed.add('Mouse0');
      this.activeKeys.add('Mouse0');
    });

    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
      this.activeKeys.delete('Mouse0');
    });
  }

  isDown(action) {
    switch (action) {
      case 'left':
        return this.activeKeys.has('ArrowLeft') || this.activeKeys.has('KeyA') || this.activeKeys.has('TouchLeft');
      case 'right':
        return this.activeKeys.has('ArrowRight') || this.activeKeys.has('KeyD') || this.activeKeys.has('TouchRight');
      case 'jump':
        return this.activeKeys.has('ArrowUp') || this.activeKeys.has('KeyW') || this.activeKeys.has('Space') || this.activeKeys.has('TouchJump');
      case 'punch':
      case 'combo':
        return this.activeKeys.has('KeyJ') || this.activeKeys.has('KeyZ') || this.activeKeys.has('Mouse0') || this.activeKeys.has('TouchPunch');
      case 'dash':
        return this.activeKeys.has('KeyL') || this.activeKeys.has('KeyC') || this.activeKeys.has('ShiftLeft') || this.activeKeys.has('TouchDash');
      case 'flask':
        return this.activeKeys.has('KeyK') || this.activeKeys.has('KeyE') || this.activeKeys.has('TouchFlask');
      case 'stomp':
        return this.activeKeys.has('KeyU') || this.activeKeys.has('TouchStomp');
      case 'lightning':
        return this.activeKeys.has('KeyO') || this.activeKeys.has('TouchLightning');
      default:
        return this.activeKeys.has(action);
    }
  }

  wasJustPressed(action) {
    switch (action) {
      case 'jump':
        return this.justPressed.has('ArrowUp') || this.justPressed.has('KeyW') || this.justPressed.has('Space') || this.justPressed.has('TouchJump');
      case 'punch':
        return this.justPressed.has('KeyJ') || this.justPressed.has('KeyZ') || this.justPressed.has('Mouse0') || this.justPressed.has('TouchPunch');
      case 'dash':
        return this.justPressed.has('KeyL') || this.justPressed.has('KeyC') || this.justPressed.has('ShiftLeft') || this.justPressed.has('TouchDash');
      case 'flask':
        return this.justPressed.has('KeyK') || this.justPressed.has('KeyE') || this.justPressed.has('TouchFlask');
      case 'stomp':
        return this.justPressed.has('KeyU') || this.justPressed.has('TouchStomp');
      case 'lightning':
        return this.justPressed.has('KeyO') || this.justPressed.has('TouchLightning');
      default:
        return this.justPressed.has(action);
    }
  }

  // Clear single-press edge states at end of tick
  update() {
    this.justPressed.clear();
  }

  setTouch(key, isPressed) {
    if (isPressed) {
      if (!this.activeKeys.has(key)) {
        this.justPressed.add(key);
      }
      this.activeKeys.add(key);
    } else {
      this.activeKeys.delete(key);
    }
  }
}
