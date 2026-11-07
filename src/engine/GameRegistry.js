// GameRegistry: Central Registry connecting all legacy, engine, world, and entity modules
// Created by Kaushal (kaushalboii)

// Engine & Renderers
export { AsciiGrid } from './AsciiGrid.js';
export { Camera } from './Camera.js';
export { Input } from './Input.js';
export { PlatformRenderer } from './PlatformRenderer.js';
export { Renderer } from './Renderer.js';

// Entities & NPCs
export { NPC } from '../entities/NPC.js';
export { Boss } from '../entities/Boss.js';
export { Enemy } from '../entities/Enemy.js';
export { EntityManager } from '../entities/EntityManager.js';
export { PlatformEnemy } from '../entities/PlatformEnemy.js';
export { PlatformPlayer } from '../entities/PlatformPlayer.js';
export { Player } from '../entities/Player.js';
export { AsciiNinja } from '../entities/AsciiNinja.js';
export { AsciiSlime, AsciiGoblin, AsciiBat, AsciiArcher } from '../entities/AsciiEnemies.js';

// World & Environments
export { Destructible } from '../world/Destructibles.js';
export { Sheep } from '../world/Sheep.js';
export { AsciiWorld } from '../world/AsciiWorld.js';
export { PlatformLevel } from '../world/PlatformLevel.js';
export { WorldMap, TileType } from '../world/WorldMap.js';

// Combat & Feedback
export { DamageTextManager } from '../combat/DamageText.js';
export { SlashArc } from '../combat/SlashArc.js';
export { AsciiFeedback } from '../combat/AsciiFeedback.js';

// UI & Radar
export { DialogueBox } from '../ui/DialogueBox.js';
export { MiniMap } from '../ui/MiniMap.js';

// VFX & Fluid Particles
export { ParticleEngine } from '../vfx/ParticleEngine.js';
export { PoisonCloud, ProjectileManager } from '../vfx/PlatformVFX.js';
export { AsciiPoisonVFX } from '../vfx/AsciiPoisonVFX.js';

// Audio
export { soundSynth } from '../audio/SoundSynth.js';
