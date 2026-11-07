// Interactive NPCs & Quest Givers for Tiny Glyphs
// King Elden in the Castle, Blacksmith Brand in the Village, Elder Shepherd in the Meadow

export class NPC {
  constructor(x, y, name, role, glyph = 'Ω') {
    this.x = x;
    this.y = y;
    this.name = name;
    this.role = role;
    this.glyph = glyph;
    this.radius = 10;
    this.promptDistance = 32;
  }

  interact(player, dialogueBox, damageText) {
    if (this.role === 'king') {
      if (player.kills >= 10) {
        dialogueBox.open(
          this.name,
          `Incredible valor, Sir Knight! You have defeated ${player.kills} rogues. Here is the Royal Bounty for your bravery!`
        );
        player.addGold(100, damageText);
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
          `Your blade is already honed to perfection with legendary tempered steel! Use it well in battle, Knight!`
        );
      } else if (player.gold >= 50) {
        dialogueBox.open(
          this.name,
          `You have the 50 Gold! Shall I forge you the Heavy Broadsword? (Increases slash damage to 28 & extends reach!)`,
          [
            {
              label: 'Upgrade Blade ($50)',
              action: () => {
                player.gold -= 50;
                player.weaponLevel = 2;
                player.weaponName = 'Heavy Broadsword';
                player.slashRadius = 34;
                player.baseDamage = 28;
                damageText.add(player.x, player.y, 'WEAPON UPGRADED!', 'crit');
              }
            }
          ]
        );
      } else {
        dialogueBox.open(
          this.name,
          `Welcome to the Village Forge! Bring me 50 Gold ($50) and I will forge you a mighty Broadsword with extended reach and devastating power.`
        );
      }
    } else if (this.role === 'shepherd') {
      dialogueBox.open(
        this.name,
        `Welcome to the green pastures, Knight! Be gentle with my sheep {m} — they get skittish when swords are swinging! They love grazing on the sweet wild grass.`
      );
    }
  }

  render(ctx, camera, player) {
    const screen = camera.worldToScreen(this.x, this.y);
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Draw NPC Glyph
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.glyph, screen.x, screen.y);

    // 2. Draw Nameplate
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(this.name, screen.x, screen.y - 12);

    // 3. Interaction Prompt if Player is Near
    if (dist <= this.promptDistance && !player.isDead) {
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('[SPACE / E: TALK]', screen.x, screen.y + 14);
    }

    ctx.restore();
  }
}
