// UpgradeShop: In-game Arsenal & Power-Up Evolution Menu
// Spend earned Coins from enemy kills to evolve weapons and upgrade power abilities!

export class UpgradeShop {
  constructor() {
    this.selectedCategory = 'weapons'; // 'weapons' or 'perks'
    this.selectedIndex = 0;
  }

  getWeapons(player) {
    return [
      {
        id: 'knife',
        name: 'COMBAT DAGGER / KNIFE',
        desc: '6-hit rapid flurry stabs with spark bursts. Ultra-fast attack rate and low stamina cost.',
        cost: 0,
        unlocked: player.unlockedWeapons.includes('knife'),
        active: player.currentWeapon === 'knife',
        icon: '🗡️',
      },
      {
        id: 'sword',
        name: 'CYBER KATANA / PLASMA SWORD',
        desc: 'Wide 3-stroke cleaving combo with heavy impact stop frames and camera shake.',
        cost: 50,
        unlocked: player.unlockedWeapons.includes('sword'),
        active: player.currentWeapon === 'sword',
        icon: '⚔️',
      },
      {
        id: 'pistol',
        name: 'LASER BLASTER / PISTOL',
        desc: 'Ranged shooting! 3 aimed laser projectiles that fly across the entire screen.',
        cost: 100,
        unlocked: player.unlockedWeapons.includes('pistol'),
        active: player.currentWeapon === 'pistol',
        icon: '🔫',
      },
      {
        id: 'rocket',
        name: 'ROCKET BAZOOKA / MEGA CANNON',
        desc: 'Heavy ordnance shoulder launcher with devastating area-of-effect explosion.',
        cost: 200,
        unlocked: player.unlockedWeapons.includes('rocket'),
        active: player.currentWeapon === 'rocket',
        icon: '🚀',
      },
      {
        id: 'lightning',
        name: 'CELESTIAL LIGHTNING STORM',
        desc: 'Calls down electric lightning bolts that chain-zap multiple enemies on screen.',
        cost: 350,
        unlocked: player.unlockedWeapons.includes('lightning'),
        active: player.currentWeapon === 'lightning',
        icon: '⚡',
      },
    ];
  }

  getPerks(player) {
    return [
      {
        id: 'damage',
        name: 'DAMAGE OVERCHARGE (+30% DMG)',
        desc: `Current Multiplier: x${player.damageMultiplier.toFixed(2)}. Increases damage of all weapons.`,
        cost: 60,
        icon: '💥',
      },
      {
        id: 'magnet',
        name: 'LOOT MAGNET (+40px RADIUS)',
        desc: `Current Radius: ${player.magnetRadius}px. Automatically pulls coins & XP to you like a magnet.`,
        cost: 40,
        icon: '🧲',
      },
      {
        id: 'hp',
        name: 'HEART TANK (+30 MAX HP & FULL HEAL)',
        desc: `Current HP: ${player.hp}/${player.maxHp}. Increases max vitality and instantly restores health.`,
        cost: 50,
        icon: '❤️',
      },
      {
        id: 'energy',
        name: 'STAMINA CORE (+25 MAX ENERGY)',
        desc: `Current Energy: ${player.energy}/${player.maxEnergy}. Allows unleashing more moves in rapid succession.`,
        cost: 45,
        icon: '🔋',
      },
      {
        id: 'jump',
        name: 'HERMES BOOTS (TRIPLE JUMP & SPEED)',
        desc: `Current Jumps: ${player.maxJumps}. Grants extra air-jump and +20% run speed!`,
        cost: 75,
        icon: '👟',
      },
      {
        id: 'flasks',
        name: 'REFILL POISON FLASKS (+3 FLASKS)',
        desc: `Current Flasks: ${player.flasks}/${player.maxFlasks}. Hugo Duprez toxic gas clouds that melt enemies.`,
        cost: 30,
        icon: '🧪',
      },
    ];
  }

  buyOrEquipWeapon(weaponId, player, soundSynth) {
    const weapons = this.getWeapons(player);
    const item = weapons.find((w) => w.id === weaponId);
    if (!item) return false;

    if (item.unlocked) {
      // Equip it
      player.currentWeaponIndex = player.unlockedWeapons.indexOf(weaponId);
      if (soundSynth) soundSynth.playSwordSlash();
      return true;
    }

    // Purchase it
    if (player.coins >= item.cost) {
      player.coins -= item.cost;
      player.unlockWeapon(weaponId);
      if (soundSynth) soundSynth.playVictory();
      return true;
    }
    return false;
  }

  buyPerk(perkId, player, soundSynth) {
    const perks = this.getPerks(player);
    const perk = perks.find((p) => p.id === perkId);
    if (!perk || player.coins < perk.cost) return false;

    player.coins -= perk.cost;

    switch (perkId) {
      case 'damage':
        player.damageMultiplier += 0.3;
        break;
      case 'magnet':
        player.magnetRadius += 40;
        break;
      case 'hp':
        player.maxHp += 30;
        player.hp = player.maxHp;
        break;
      case 'energy':
        player.maxEnergy += 25;
        player.energy = player.maxEnergy;
        break;
      case 'jump':
        player.maxJumps = Math.min(4, player.maxJumps + 1);
        player.moveSpeed += 25;
        break;
      case 'flasks':
        player.flasks = Math.min(player.maxFlasks, player.flasks + 3);
        break;
    }

    if (soundSynth) soundSynth.playCoin();
    return true;
  }

  draw(ctx, renderW, renderH, player) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 7, 12, 0.94)';
    ctx.fillRect(0, 0, renderW, renderH);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('⚡ CYBER MARINO: ARSENAL & POWER UPGRADES', renderW / 2, 45);

    // Coins & Level Banner
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText(
      `🪙 LOOT CREDITS: ${player.coins}  |  ⭐ LEVEL: ${player.level} (${player.xp}/${player.xpNeeded} XP)  |  EQUIPPED: ${player.currentWeapon.toUpperCase()}`,
      renderW / 2,
      74
    );

    // Weapons List (Left Half)
    const weapons = this.getWeapons(player);
    const leftX = 40;
    const itemW = 420;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('⚔️ WEAPON EVOLUTION TREE', leftX, 105);

    weapons.forEach((w, i) => {
      const y = 120 + i * 72;
      const isEquipped = w.active;
      const isUnlocked = w.unlocked;

      ctx.fillStyle = isEquipped ? '#1a2a3a' : isUnlocked ? '#14141e' : '#0e0e14';
      ctx.fillRect(leftX, y, itemW, 64);
      ctx.strokeStyle = isEquipped ? '#00f0ff' : isUnlocked ? '#444466' : '#222233';
      ctx.strokeRect(leftX, y, itemW, 64);

      ctx.fillStyle = isEquipped ? '#00f0ff' : isUnlocked ? '#ffffff' : '#888899';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`${w.icon} ${w.name}`, leftX + 10, y + 20);

      ctx.fillStyle = '#8888aa';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(w.desc, leftX + 10, y + 36);

      // Status / Cost Button
      ctx.font = 'bold 11px "Courier New", monospace';
      if (isEquipped) {
        ctx.fillStyle = '#00ff88';
        ctx.fillText('[ EQUIPPED ]', leftX + 310, y + 54);
      } else if (isUnlocked) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('[ CLICK TO EQUIP ]', leftX + 270, y + 54);
      } else {
        const canAfford = player.coins >= w.cost;
        ctx.fillStyle = canAfford ? '#ffea00' : '#ff4444';
        ctx.fillText(`UNLOCK: ${w.cost} 🪙`, leftX + 280, y + 54);
      }
    });

    // Perks List (Right Half)
    const perks = this.getPerks(player);
    const rightX = 490;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('🧬 POWER-UP PERKS & ABILITIES', rightX, 105);

    perks.forEach((p, i) => {
      const y = 120 + i * 58;
      const canAfford = player.coins >= p.cost;

      ctx.fillStyle = '#14141e';
      ctx.fillRect(rightX, y, itemW, 50);
      ctx.strokeStyle = canAfford ? '#ffea00' : '#333348';
      ctx.strokeRect(rightX, y, itemW, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`${p.icon} ${p.name}`, rightX + 10, y + 18);

      ctx.fillStyle = '#8888aa';
      ctx.font = '9.5px "Courier New", monospace';
      ctx.fillText(p.desc, rightX + 10, y + 32);

      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = canAfford ? '#ffea00' : '#777788';
      ctx.fillText(`BUY: ${p.cost} 🪙`, rightX + 310, y + 42);
    });

    // Return to game prompt
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText('Click any card to Buy/Equip • Press [ESC] or [U] to Return to Mission', renderW / 2, 515);

    ctx.restore();
  }

  handleClick(mouseX, mouseY, player, soundSynth) {
    const leftX = 40;
    const itemW = 420;
    const weapons = this.getWeapons(player);

    // Check weapon card clicks
    weapons.forEach((w, i) => {
      const y = 120 + i * 72;
      if (mouseX >= leftX && mouseX <= leftX + itemW && mouseY >= y && mouseY <= y + 64) {
        this.buyOrEquipWeapon(w.id, player, soundSynth);
      }
    });

    // Check perk card clicks
    const rightX = 490;
    const perks = this.getPerks(player);
    perks.forEach((p, i) => {
      const y = 120 + i * 58;
      if (mouseX >= rightX && mouseX <= rightX + itemW && mouseY >= y && mouseY <= y + 50) {
        this.buyPerk(p.id, player, soundSynth);
      }
    });
  }
}
