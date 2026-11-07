// Interactive NPCs & Story Characters for Cyber Marino
// Commander Roland (Skyline), Alchemist Lyra (Acid Sewers), Oracle Elyon (Overlord Citadel)

export class NPC {
  constructor(x, y, name, role, glyph = 'Ω') {
    this.x = x;
    this.y = y;
    this.name = name;
    this.role = role;
    this.glyph = glyph;
    this.radius = 12;
    this.promptDistance = 38;
    this.hasRewarded = false;
  }

  interact(player, dialogueBox, damageText, world) {
    if (this.role === 'roland') {
      if (world && world.enemies && world.enemies.every(e => e.isDead)) {
        dialogueBox.open(
          this.name,
          `Outstanding valor, Valen! You have cleared the vanguard patrol. The ancient Leyline Gate on the right is now aligned! Step through to descend into the Sunken Cistern!`
        );
        if (!this.hasRewarded) {
          this.hasRewarded = true;
          player.coins = (player.coins || 0) + 100;
          if (damageText && damageText.add) damageText.add(player.x, player.y - 20, '+100 AETHER SHARDS!', 'crit');
        }
      } else {
        dialogueBox.open(
          this.name,
          `Valen! Lord Malakor the Dread Automaton has shattered the 21 Primal Seals across Aetheria. Hostile automata are hunting survivors. Purge the 4 vanguard patrols, smash the clockwork siege crates for Aether Shards, and commune with our sanctuary sheep to awaken the Leyline Gate!`
        );
      }
    } else if (this.role === 'lyra') {
      if (!this.hasRewarded) {
        this.hasRewarded = true;
        player.flasks = Math.min(player.maxFlasks || 5, (player.flasks || 2) + 2);
        player.coins = (player.coins || 0) + 150;
        dialogueBox.open(
          this.name,
          `Watch your footing, Valen! The Sunken Cistern is flooded with caustic acid runoff. Leap across elevated catwalks and avoid the toxic mire! Take these +2 Poison Flasks [K/E] and +150 Aether Shards to dissolve armored automata and plunder the fortified chests!`
        );
        if (damageText && damageText.add) damageText.add(player.x, player.y - 20, '+2 FLASKS & +150 SHARDS!', 'crit');
      } else {
        dialogueBox.open(
          this.name,
          `Remember: The caustic acid burns on contact! Stomp onto automata from above or throw poison flasks to corrode their heavy hull. The portal to the Dread Citadel awaits on the right aqueduct!`
        );
      }
    } else if (this.role === 'elyon') {
      if (!this.hasRewarded) {
        this.hasRewarded = true;
        player.hp = player.maxHp;
        player.energy = player.maxEnergy;
        dialogueBox.open(
          this.name,
          `You have breached the Dread Citadel, Valen! Lord Malakor awaits in the clockwork throne room. I bestow upon you the Blessing of Aetheria: Full Life and Maximum Energy! Unleash your Concussion Mortar and summon Tempest Wrath to shatter Malakor and restore the 21 Primal Seals forever!`
        );
        if (damageText && damageText.add) damageText.add(player.x, player.y - 20, '★ BLESSING OF AETHERIA: FULL LIFE/NRG ★', 'crit');
      } else {
        dialogueBox.open(
          this.name,
          `Strike true, Warden! Use [Q] to switch between your Broadsword, Blaster, Concussion Mortar, and Tempest Wrath. Dodge Malakor’s mortar barrages and restore peace to Aetheria!`
        );
      }
    } else if (this.role === 'king') {
      if (player.kills >= 10) {
        dialogueBox.open(
          this.name,
          `Incredible valor, Sir Knight! You have defeated ${player.kills} rogues. Here is the Royal Bounty for your bravery!`
        );
        if (player.addGold) player.addGold(100, damageText);
      } else {
        dialogueBox.open(
          this.name,
          `Greetings, Sir Knight! The kingdom has been overrun by rogue raiders. Patrol the island, protect the villagers, and slay 10 bandits to claim the Royal Bounty!`
        );
      }
    } else if (this.role === 'blacksmith') {
      if (player.weaponLevel >= 2) {
        dialogueBox.open(
          this.name,
          `Your blade is already honed to perfection with legendary tempered steel! Use it well in battle!`
        );
      } else if ((player.gold || player.coins) >= 50) {
        dialogueBox.open(
          this.name,
          `You have the 50 Scrap! Shall I forge you the Heavy Broadsword? (Increases slash damage and cleaving reach!)`,
          [
            {
              label: 'Upgrade Blade ($50)',
              action: () => {
                if (player.gold !== undefined) player.gold -= 50;
                else player.coins -= 50;
                player.weaponLevel = 2;
                player.weaponName = 'Heavy Broadsword';
                player.currentWeapon = 'sword';
                if (damageText && damageText.add) damageText.add(player.x, player.y, 'WEAPON UPGRADED!', 'crit');
              }
            }
          ]
        );
      } else {
        dialogueBox.open(
          this.name,
          `Welcome to the Forge! Bring me 50 Scrap and I will forge you a mighty Broadsword with extended reach and devastating power.`
        );
      }
    } else if (this.role === 'shepherd') {
      dialogueBox.open(
        this.name,
        `Welcome to the pasture! Be gentle with my cyber sheep {m} — they get skittish when blasters and swords are firing! They love grazing in peace.`
      );
    }
  }

  render(ctx, cameraOrScale, player) {
    let screenX = this.x;
    let screenY = this.y;

    if (cameraOrScale && typeof cameraOrScale.worldToScreen === 'function') {
      const s = cameraOrScale.worldToScreen(this.x, this.y);
      screenX = s.x;
      screenY = s.y;
    } else if (typeof cameraOrScale === 'number') {
      screenX = this.x * cameraOrScale;
      screenY = this.y * cameraOrScale;
    }

    const dist = player ? Math.hypot(player.x - this.x, player.y - this.y) : 999;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. NPC Glow & Glyph
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText(this.glyph, screenX, screenY);
    ctx.shadowBlur = 0;

    // 2. Nameplate
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.name, screenX, screenY - 14);

    // 3. Interaction Prompt if Player is Near
    if (dist <= this.promptDistance && (!player || !player.isDead)) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.fillText('[E / SPACE: TALK]', screenX, screenY + 16);
    }

    ctx.restore();
  }
}

