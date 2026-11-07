// Interactive NPCs & Story Characters for The Boundless Spiral
// Aria the Chronicler, Kaelen the Forge Master, Seer Vesper, and Nomad Zephyr
// Authored by Kaushal (kaushalboii)

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
    const floor = world && world.currentFloor ? world.currentFloor : 1;

    if (this.role === 'chronicler' || this.role === 'roland') {
      if (world && world.enemies && world.enemies.every(e => e.isDead)) {
        dialogueBox.open(
          this.name,
          `Incredible prowess, Spiral Walker! You have purified Floor ${floor}. The Celestial Ascension Gate on the far right has opened! Step through to ascend deeper into infinity!`
        );
        if (!this.hasRewarded) {
          this.hasRewarded = true;
          player.coins = (player.coins || 0) + 120;
          if (damageText && damageText.add) damageText.add(player.x, player.y - 20, '+120 AETHER SHARDS!', 'crit');
        }
      } else {
        dialogueBox.open(
          this.name,
          `Greetings, Spiral Walker! You have entered Floor ${floor} of the Boundless Spiral. When the Genesis Core fractured, reality split into infinite chambers cycling through all 21 Primal Weaves. Purge the elemental hostiles, plunder the relic chests, and enter the Ascension Gate to climb without limit!`
        );
      }
    } else if (this.role === 'smith' || this.role === 'lyra') {
      if (!this.hasRewarded) {
        this.hasRewarded = true;
        player.flasks = Math.min(player.maxFlasks || 5, (player.flasks || 2) + 2);
        player.coins = (player.coins || 0) + 150;
        dialogueBox.open(
          this.name,
          `Take these +2 Toxic Flasks [E/K] and +150 Aether Shards! As you ascend higher, elemental resistance and enemy armor will increase. Use [Q] to switch between your Dagger, Broadsword, Blaster, and Mortar to exploit their weaknesses!`
        );
        if (damageText && damageText.add) damageText.add(player.x, player.y - 20, '+2 FLASKS & +150 SHARDS!', 'crit');
      } else {
        dialogueBox.open(
          this.name,
          `Remember: Every 5th floor holds a Colossus Boss Trial. Stomp from above for massive bonus damage, and visit the Arsenal Forge [U] to boost your attributes!`
        );
      }
    } else if (this.role === 'oracle' || this.role === 'elyon') {
      if (!this.hasRewarded) {
        this.hasRewarded = true;
        player.hp = player.maxHp;
        player.energy = player.maxEnergy;
        dialogueBox.open(
          this.name,
          `I bestow upon you the Blessing of the Boundless Core: Full Health and Maximum Energy! The Spiral continues forever — let your resonance shine across all dimensions!`
        );
        if (damageText && damageText.add) damageText.add(player.x, player.y - 20, '★ BLESSING OF THE CORE: FULL LIFE & ENERGY ★', 'crit');
      } else {
        dialogueBox.open(
          this.name,
          `Ascend boldly! There is no ceiling to the Boundless Spiral. Test the limits of your martial power and harness the 244 Primal Arts!`
        );
      }
    } else if (this.role === 'nomad') {
      dialogueBox.open(
        this.name,
        `I travel between the fractal layers of the Spiral. Pet the sanctuary sheep {m} for gentle wisdom and +25 XP, and strike the lucky blocks [ ? ] for invulnerability stars!`
      );
    }
  }

  draw(grid) {
    if (grid && grid.setChar) {
      grid.setChar(Math.round(this.x), Math.round(this.y), this.glyph, '#00f0ff', 1.0);
    }
  }
}
