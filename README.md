# † TINY GLYPHS †
> **An Open-World ASCII Action Adventure** inspired by *Tiny Swords*, rendered in high-contrast Black & White.

![Tiny Glyphs Preview](https://img.shields.io/badge/Aesthetic-1--Bit%20Monochrome%20ASCII-white?style=for-the-badge&logo=gnubash)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Deploy](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen?style=for-the-badge)

---

## ⚔️ The World of Tiny Glyphs

Explore an open-world medieval fantasy island built entirely out of animated ASCII/ANSI glyphs in pure high-contrast Black & White:

- **The Royal Castle Fortress**: Stone ramparts, battlements, towers, and the grand throne keep.
- **Village Highlands**: Cottages with smoking chimneys, cobblestone paths, and water bridges.
- **Coastal Cliffs & Ocean**: Animated shimmering waves (`~`, `≈`, `∿`) and sandy shorelines.
- **Wildlife**: Cute grazing sheep `{m}` that wander, munch grass, bleat, and flee from sword swings.
- **Enemies**: Rogue Knights (`k`) and Spearmen (`p`) that patrol the kingdom and attack on sight.

---

## 🎮 Controls

| Action | Key / Control |
| :--- | :--- |
| **Move** | `W`, `A`, `S`, `D` or Arrow Keys |
| **Sword Slash** | `Space` or **Left Mouse Click** |
| **Dodge Dash** | `Shift` or **Right Mouse Click** |
| **Shield Block** | `Q` or `E` |
| **Mute / Unmute** | `M` (or on-screen button) |
| **Respawn** | `R` |

---

## ✨ Features

- **Pure Monochromatic Aesthetics**: High-contrast white (`#FFFFFF`) characters on deep black (`#0A0A0A`), with inverted contrast screen flashes on critical hits and damage.
- **360° Mouse-Aim & Fluid Combat**: Swing your sword with sweeping crescent slash arcs `) ) )`, deflect spear thrusts with your kite shield `[#]`, and dash with trailing afterimages.
- **Zero-Dependency 8-Bit Web Audio**: Synthesized sound effects generated live using the Web Audio API — metallic clanks, sword swooshes, footsteps, and sheep bleats.
- **CRT Scanline Mode**: One-click toggle for authentic retro terminal curvature and scanline overlay.
- **Automated GitHub Pages Deployment**: Fully automated via GitHub Actions (`.github/workflows/deploy.yml`).

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🌐 Deploying to GitHub Pages

This repository includes an automated GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. Go to your repository on GitHub: **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Push your changes to `main`:
   ```bash
   git add .
   git commit -m "Deploy Tiny Glyphs"
   git push origin main
   ```
4. GitHub Actions will automatically build and publish your game!

---

### License
MIT License. Created by [Kaushal](https://github.com/kaushalboii).

