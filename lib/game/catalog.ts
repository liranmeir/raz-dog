export type Food = { id: string; emoji: string; name: string };

/** Foods for the feeding game. `name` is spoken in Hebrew when enabled. */
export const FOODS: Food[] = [
  { id: 'apple', emoji: '🍎', name: 'תפוח' },
  { id: 'banana', emoji: '🍌', name: 'בננה' },
  { id: 'bone', emoji: '🦴', name: 'עצם' },
  { id: 'carrot', emoji: '🥕', name: 'גזר' },
  { id: 'cookie', emoji: '🍪', name: 'עוגיה' },
  { id: 'cheese', emoji: '🧀', name: 'גבינה' },
  { id: 'watermelon', emoji: '🍉', name: 'אבטיח' },
  { id: 'pizza', emoji: '🍕', name: 'פיצה' },
  { id: 'strawberry', emoji: '🍓', name: 'תות' },
  { id: 'corn', emoji: '🌽', name: 'תירס' },
];

export type ShopItem = { id: string; emoji: string; name: string; price: number; slot: 'head' | 'face' };

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'cap', emoji: '🧢', name: 'כובע מצחייה', price: 5, slot: 'head' },
  { id: 'bow', emoji: '🎀', name: 'פפיון', price: 5, slot: 'head' },
  { id: 'tophat', emoji: '🎩', name: 'מגבעת', price: 8, slot: 'head' },
  { id: 'flower', emoji: '🌸', name: 'פרח', price: 8, slot: 'head' },
  { id: 'glasses', emoji: '🕶️', name: 'משקפי שמש', price: 10, slot: 'face' },
  { id: 'grad', emoji: '🎓', name: 'כובע סיום', price: 12, slot: 'head' },
  { id: 'crown', emoji: '👑', name: 'כתר', price: 20, slot: 'head' },
];

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}
