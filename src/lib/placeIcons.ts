import {
  Anchor,
  Baby,
  Banknote,
  Beer,
  Bike,
  BookOpen,
  Building2,
  BusFront,
  Cake,
  Camera,
  Car,
  Church,
  Clapperboard,
  Coffee,
  Croissant,
  Drumstick,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  GlassWater,
  Heart,
  Home,
  Hotel,
  IceCream,
  Landmark,
  Leaf,
  MapPin,
  Martini,
  Mountain,
  Music2,
  Palette,
  PawPrint,
  Plane,
  Salad,
  Shirt,
  ShoppingBag,
  Soup,
  Store,
  Sun,
  TentTree,
  Ticket,
  TrainFront,
  Trees,
  Umbrella,
  UtensilsCrossed,
  Wine,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface PlaceIconOption {
  key: string;
  label: string;
  Icon: LucideIcon;
  category: string;
}

export interface PlaceIconGroup {
  label: string;
  icons: PlaceIconOption[];
}

const FOOD_AND_DRINK: PlaceIconOption[] = [
  { key: 'coffee', label: 'Coffee', Icon: Coffee, category: 'Coffee Shop' },
  { key: 'cafe', label: 'Café', Icon: Croissant, category: 'Café' },
  { key: 'restaurant', label: 'Restaurant', Icon: UtensilsCrossed, category: 'Restaurant' },
  { key: 'bakery', label: 'Bakery', Icon: Cake, category: 'Bakery' },
  { key: 'dessert', label: 'Dessert', Icon: IceCream, category: 'Dessert' },
  { key: 'bar', label: 'Bar', Icon: Martini, category: 'Bar' },
  { key: 'winery', label: 'Wine bar', Icon: Wine, category: 'Wine Bar' },
  { key: 'brewery', label: 'Brewery', Icon: Beer, category: 'Brewery' },
  { key: 'drinks', label: 'Drinks', Icon: GlassWater, category: 'Drinks' },
  { key: 'brunch', label: 'Brunch', Icon: Salad, category: 'Brunch' },
  { key: 'quick-bite', label: 'Quick bite', Icon: Drumstick, category: 'Quick Bite' },
  { key: 'soup', label: 'Soup', Icon: Soup, category: 'Soup' },
];

const SHOPS: PlaceIconOption[] = [
  { key: 'shopping', label: 'Shopping', Icon: ShoppingBag, category: 'Shopping' },
  { key: 'market', label: 'Market', Icon: Store, category: 'Market' },
  { key: 'clothing', label: 'Clothing', Icon: Shirt, category: 'Clothing' },
  { key: 'gifts', label: 'Gifts', Icon: Gift, category: 'Gifts' },
  { key: 'jewelry', label: 'Jewelry', Icon: Gem, category: 'Jewelry' },
];

const CULTURE: PlaceIconOption[] = [
  { key: 'museum', label: 'Museum', Icon: Landmark, category: 'Museum' },
  { key: 'gallery', label: 'Gallery', Icon: Palette, category: 'Art Gallery' },
  { key: 'landmark', label: 'Landmark', Icon: Camera, category: 'Landmark' },
  { key: 'books', label: 'Books', Icon: BookOpen, category: 'Bookstore' },
  { key: 'church', label: 'Church', Icon: Church, category: 'Religious Site' },
  { key: 'cinema', label: 'Cinema', Icon: Film, category: 'Cinema' },
  { key: 'theatre', label: 'Theatre', Icon: Clapperboard, category: 'Theatre' },
  { key: 'music', label: 'Music', Icon: Music2, category: 'Music Venue' },
  { key: 'arcade', label: 'Arcade', Icon: Gamepad2, category: 'Arcade' },
  { key: 'events', label: 'Events', Icon: Ticket, category: 'Events' },
];

const OUTDOORS: PlaceIconOption[] = [
  { key: 'park', label: 'Park', Icon: Trees, category: 'Park' },
  { key: 'hiking', label: 'Hiking', Icon: Mountain, category: 'Hiking' },
  { key: 'camping', label: 'Camping', Icon: TentTree, category: 'Camping' },
  { key: 'garden', label: 'Garden', Icon: Leaf, category: 'Garden' },
  { key: 'beach', label: 'Beach', Icon: Umbrella, category: 'Beach' },
  { key: 'viewpoint', label: 'Viewpoint', Icon: Sun, category: 'Viewpoint' },
  { key: 'water', label: 'Water', Icon: Anchor, category: 'Waterfront' },
];

const TRANSIT: PlaceIconOption[] = [
  { key: 'transit', label: 'Transit', Icon: TrainFront, category: 'Transit Station' },
  { key: 'bus', label: 'Bus stop', Icon: BusFront, category: 'Bus Station' },
  { key: 'bike', label: 'Bike', Icon: Bike, category: 'Bike Share' },
  { key: 'car', label: 'Car', Icon: Car, category: 'Parking' },
  { key: 'fuel', label: 'Fuel', Icon: Fuel, category: 'Gas Station' },
  { key: 'flight', label: 'Airport', Icon: Plane, category: 'Airport' },
];

const STAY: PlaceIconOption[] = [
  { key: 'hotel', label: 'Hotel', Icon: Hotel, category: 'Hotel' },
  { key: 'rental', label: 'Rental', Icon: Home, category: 'Vacation Rental' },
  { key: 'building', label: 'Building', Icon: Building2, category: 'Apartment' },
];

const EVERYDAY: PlaceIconOption[] = [
  { key: 'gym', label: 'Gym', Icon: Dumbbell, category: 'Gym' },
  { key: 'wellness', label: 'Wellness', Icon: Heart, category: 'Wellness' },
  { key: 'services', label: 'Services', Icon: Wrench, category: 'Services' },
  { key: 'pet', label: 'Pet friendly', Icon: PawPrint, category: 'Pet Friendly' },
  { key: 'atm', label: 'ATM', Icon: Banknote, category: 'ATM' },
  { key: 'family', label: 'Family', Icon: Baby, category: 'Family Friendly' },
];

export const PLACE_ICON_GROUPS: PlaceIconGroup[] = [
  { label: 'Food & drink', icons: FOOD_AND_DRINK },
  { label: 'Shops', icons: SHOPS },
  { label: 'Culture & sights', icons: CULTURE },
  { label: 'Outdoors', icons: OUTDOORS },
  { label: 'Transit', icons: TRANSIT },
  { label: 'Stay', icons: STAY },
  { label: 'Everyday', icons: EVERYDAY },
];

const ALL_ICONS: PlaceIconOption[] = PLACE_ICON_GROUPS.flatMap((group) => group.icons);

const ICON_BY_KEY = new Map(ALL_ICONS.map((option) => [option.key, option]));

/** Resolves a stored icon key to its lucide component, defaulting to a pin. */
export function getPlaceIcon(key: string | null | undefined): LucideIcon {
  if (!key) return MapPin;
  return ICON_BY_KEY.get(key)?.Icon ?? MapPin;
}

/** Returns the suggested category label for an icon key, if any. */
export function categoryForIcon(key: string | null | undefined): string | null {
  if (!key) return null;
  return ICON_BY_KEY.get(key)?.category ?? null;
}

/** Matches a legacy Foursquare-style category string to the closest icon. */
export function suggestIconFromCategory(category: string | null | undefined): string | null {
  if (!category) return null;
  const c = category.toLowerCase();

  if (/(coffee|caf|café|tea)/.test(c)) return 'coffee';
  if (/(bakery|baker|cake|pastry)/.test(c)) return 'bakery';
  if (/(dessert|ice cream|icecream|sweet)/.test(c)) return 'dessert';
  if (/(bar|brewery|beer|winery|wine|pub|night)/.test(c)) return 'bar';
  if (/(cocktail|drinks|juice)/.test(c)) return 'drinks';
  if (/(breakfast|brunch)/.test(c)) return 'brunch';
  if (/(restaurant|dining|food|diner|bistro)/.test(c)) return 'restaurant';
  if (/(soup)/.test(c)) return 'soup';
  if (/(shopping|mall|store|market|supermarket)/.test(c)) return 'shopping';
  if (/(clothing|fashion|boutique|apparel)/.test(c)) return 'clothing';
  if (/(museum|gallery|art|exhibit)/.test(c)) return 'museum';
  if (/(landmark|historic|monument|castle|tower)/.test(c)) return 'landmark';
  if (/(book|library)/.test(c)) return 'books';
  if (/(church|catholic|mosque|synagogue|temple|religious)/.test(c)) return 'church';
  if (/(cinema|movie|film)/.test(c)) return 'cinema';
  if (/(theatre|theater|stage|opera)/.test(c)) return 'theatre';
  if (/(music|concert|club)/.test(c)) return 'music';
  if (/(park|garden|green|playground)/.test(c)) return 'park';
  if (/(hiking|mountain|trail)/.test(c)) return 'hiking';
  if (/(camp|campsite|glamping)/.test(c)) return 'camping';
  if (/(beach|coast|harbor|harbour)/.test(c)) return 'beach';
  if (/(viewpoint|lookout|view)/.test(c)) return 'viewpoint';
  if (/(train|transit|station|subway|metro|rail)/.test(c)) return 'transit';
  if (/(bus)/.test(c)) return 'bus';
  if (/(bike|bicycle|cycling)/.test(c)) return 'bike';
  if (/(parking|car wash)/.test(c)) return 'car';
  if (/(gas|fuel|charging)/.test(c)) return 'fuel';
  if (/(airport|flight|plane)/.test(c)) return 'flight';
  if (/(hotel|motel|lodging|hostel|inn)/.test(c)) return 'hotel';
  if (/(rental|vacation|airbnb)/.test(c)) return 'rental';
  if (/(gym|fitness|workout)/.test(c)) return 'gym';
  if (/(spa|wellness|salon|beauty|massage)/.test(c)) return 'wellness';
  if (/(atm|bank|money)/.test(c)) return 'atm';
  return null;
}

/** Best-effort icon key for a place, preferring stored then category-derived. */
export function placeIconKey(icon: string | null | undefined, category: string | null | undefined): string | null {
  if (icon && ICON_BY_KEY.has(icon)) return icon;
  return suggestIconFromCategory(category);
}
