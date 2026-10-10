/**
 * Ras ALmal Tycoon — Grand Royal Museum & Antiquities Service
 * Authoritative Server Engine for Museum Minting, Auctions & Buyback Liquidity
 */

const fs = require('fs');
const path = require('path');
const dbService = require('./db-service');

const MUSEUM_STATE_FILE = path.join(__dirname, '../../data/museum-state.json');

// Preloaded Classical Royal Relics
const DEFAULT_MUSEUM_ITEMS = [
  {
    id: 'relic_tut_mask',
    name: 'قناع توت عنخ آمون الذهبي الخالص ',
    category: 'آثار ملكية فرعونية',
    rarity: 'mythic', // common | rare | epic | legendary | mythic
    rarityLabel: 'أثرية أسطورية (Mythic 1/1)',
    icon: '',
    description: 'أعظم تحفة أثرية في التاريخ البشري، مصنوع من الذهب الخالص والأحجار الكريمة، يمنح حامله هيبة مطلقة وقيمة استثمارية أزلية.',
    buybackPrice: 75000000, // 75M EGP base buyback
    stock: 1,
    totalMinted: 1,
    edition: 'نسخة فريدة 1/1',
    createdAt: Date.now()
  },
  {
    id: 'relic_hope_diamond',
    name: 'ماسة الأمل الزرقاء النادرة ',
    category: 'مجوهرات وأحجار كريمة',
    rarity: 'legendary',
    rarityLabel: 'جوهرة أسطورية (Legendary)',
    icon: '',
    description: 'أشهر وأندر ماسة زرقاء في العالم، تمتلك بريقاً يخطف الأبصار وتعتبر ملاذاً آمناً لكبار أثرياء الكوكب.',
    buybackPrice: 50000000, // 50M EGP
    stock: 2,
    totalMinted: 2,
    edition: 'نسخة ملكية 1/2',
    createdAt: Date.now()
  },
  {
    id: 'relic_damascus_sword',
    name: 'سيف الفاتح الدمشقي المرصع ',
    category: 'أسلحة وتحف حربية',
    rarity: 'epic',
    rarityLabel: 'تحفة نادرة (Epic)',
    icon: '',
    description: 'سيف فولاذي دمشقي أصيل مرصع بالياقوت والذهب، يجسد تاريخ الانتصارات والعزة.',
    buybackPrice: 25000000, // 25M EGP
    stock: 3,
    totalMinted: 3,
    edition: 'إصدار محدود 1/3',
    createdAt: Date.now()
  },
  {
    id: 'relic_horus_falcon',
    name: 'تمثال صقر حورس الملكي الذهبي ',
    category: 'تماثيل مقدسة',
    rarity: 'legendary',
    rarityLabel: 'تمثال أسطوري (Legendary)',
    icon: '',
    description: 'تمثال ذهبي باهر يرمز للقوة والحماية الإلهية لملوك وأمراء العصور الذهبية.',
    buybackPrice: 40000000, // 40M EGP
    stock: 2,
    totalMinted: 2,
    edition: 'نسخة مسبوكة 1/2',
    createdAt: Date.now()
  }
];

class MuseumService {
  constructor() {
    this.items = [];
    this._loadPersistedState();
  }

  _ensureDataDir() {
    const dataDir = path.dirname(MUSEUM_STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  _loadPersistedState() {
    try {
      this._ensureDataDir();
      if (fs.existsSync(MUSEUM_STATE_FILE)) {
        const raw = fs.readFileSync(MUSEUM_STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.items = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('[MuseumService] Could not load persisted state, using defaults:', e.message);
    }
    this.items = [...DEFAULT_MUSEUM_ITEMS];
    this._savePersistedState();
  }

  _savePersistedState() {
    try {
      this._ensureDataDir();
      fs.writeFileSync(MUSEUM_STATE_FILE, JSON.stringify(this.items, null, 2), 'utf8');
    } catch (e) {
      console.error('[MuseumService] Error saving state:', e.message);
    }
  }

  /**
   * Returns all items currently cataloged in the Museum
   */
  getAllItems() {
    return this.items;
  }

  getItemById(id) {
    if (!id) return null;
    return this.items.find(i => String(i.id).toLowerCase() === String(id).toLowerCase()) || null;
  }

  /**
   * Admin Mints a new Museum Item / Relic
   */
  mintItem({ name, category, rarity, icon, description, buybackPrice, stock, edition }) {
    if (!name) throw new Error('اسم التحفة مطلوب.');

    const cleanPrice = Math.max(100000, Number(buybackPrice || 10000000));
    const cleanStock = Math.max(1, Number(stock || 1));
    const cleanRarity = rarity || 'epic';
    
    const rarityLabels = {
      common: 'شائعة (Common)',
      rare: 'نادرة (Rare)',
      epic: 'تحفة ممتازة (Epic)',
      legendary: 'أسطورية (Legendary)',
      mythic: 'فريدة ملكية (Mythic 1/1)'
    };

    const newItem = {
      id: `relic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: String(name).trim(),
      category: String(category || 'تحف وآثار نادرة').trim(),
      rarity: cleanRarity,
      rarityLabel: rarityLabels[cleanRarity] || cleanRarity,
      icon: String(icon || '').trim(),
      description: String(description || 'تحفة نادرة ومقتنى أثري فاخر مسجل لدى المتحف الملكي.').trim(),
      buybackPrice: cleanPrice,
      stock: cleanStock,
      totalMinted: cleanStock,
      edition: edition ? String(edition).trim() : (cleanStock === 1 ? 'نسخة فريدة 1/1' : `إصدار محدود (1 من ${cleanStock})`),
      createdAt: Date.now()
    };

    this.items.unshift(newItem);
    this._savePersistedState();
    return { success: true, item: newItem };
  }

  /**
   * Admin deletes an item from the Museum catalog
   */
  deleteItem(id) {
    const idx = this.items.findIndex(i => String(i.id).toLowerCase() === String(id).toLowerCase());
    if (idx === -1) throw new Error('التحفة غير موجودة بالمتحف.');
    const deleted = this.items.splice(idx, 1)[0];
    this._savePersistedState();
    return { success: true, deleted };
  }

  /**
   * Deduct stock when an item is won via auction or awarded
   */
  decrementStock(itemId, count = 1) {
    const item = this.getItemById(itemId);
    if (!item) return;
    const qty = Math.max(1, Number(count || 1));
    item.stock = Math.max(0, item.stock - qty);
    this._savePersistedState();
  }

  /**
   * Player Sells an Owned Relic Back to the Museum for Cash/Bank
   */
  async sellToMuseum(username, relicId) {
    if (!username) throw new Error('اسم اللاعب مطلوب.');
    if (!relicId) throw new Error('معرف القطعة الأثرية مطلوب.');

    const cleanUser = String(username).trim();
    const playerRow = await dbService.getPlayerByUsername(cleanUser);
    if (!playerRow) throw new Error('تعذر العثور على حساب اللاعب.');

    const rawState = (typeof playerRow.state === 'object' && playerRow.state) ? { ...playerRow.state } : {};
    if (!Array.isArray(rawState.museumRelics)) {
      rawState.museumRelics = [];
    }

    // Find the relic in the player's possession
    const relicIndex = rawState.museumRelics.findIndex(r => 
      String(r.id).toLowerCase() === String(relicId).toLowerCase() ||
      String(r.relicId).toLowerCase() === String(relicId).toLowerCase()
    );

    if (relicIndex === -1) {
      throw new Error('عذراً، هذه القطعة الأثرية غير موجودة في حقيبة مقتنياتك.');
    }

    const playerRelic = rawState.museumRelics[relicIndex];
    
    // Find catalog item to get latest authoritative buyback price
    const catalogItem = this.getItemById(playerRelic.relicId || playerRelic.id);
    const buybackValue = catalogItem ? catalogItem.buybackPrice : (playerRelic.buybackPrice || 10000000);

    // Remove relic from player
    rawState.museumRelics.splice(relicIndex, 1);

    // Credit payout to Bank
    const curBank = Number(playerRow.bank || rawState.bank || 0);
    rawState.bank = curBank + buybackValue;
    playerRow.bank = rawState.bank;

    // Increment museum catalog stock if it still exists
    if (catalogItem) {
      catalogItem.stock += 1;
      this._savePersistedState();
    }

    // Persist player update
    await dbService.updatePlayerState(cleanUser, rawState);

    return {
      success: true,
      soldRelicName: playerRelic.name || catalogItem?.name || 'تحفة أثرية',
      payout: buybackValue,
      newBankBalance: rawState.bank,
      remainingRelicsCount: rawState.museumRelics.length,
      message: `تم بيع [${playerRelic.name || 'التحفة'}] للمتحف الملكي بنجاح واستلام ${buybackValue.toLocaleString()} ج.م في حسابك البنكي!`
    };
  }
}

module.exports = new MuseumService();
