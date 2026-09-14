export type CityId = "pune" | "bengaluru" | "mumbai";

export type CityConfig = {
  id: CityId;
  name: string;
  state: string;
  // Other spellings the outside world uses for this city — matched when
  // importing lists, verifying websites, and querying job aggregators
  // (Adzuna/Jooble index Bengaluru as "Bangalore", for example).
  aliases: string[];
  // Location string the job aggregators (Adzuna/Jooble) index this city
  // under, when it isn't `name`.
  jobsLocation?: string;
  centerLat: number;
  centerLng: number;
  // [west, south, east, north] — roughly the metro region we map. Used to
  // flag imported coordinates that land outside the city, never to move them.
  bbox: [number, number, number, number];
  defaultZoom: number;
  // Which self-hosted .pmtiles file covers this city (infra/pmtiles/README.md).
  tileset: "maharashtra" | "bengaluru";
  useBounds: boolean; // hybrid switch: false = snapshot, true = bounds+Typesense
  discoverySources: string[];
};

// Order is the order cities appear in on the landing page (two per page).
export const cities: CityConfig[] = [
  {
    id: "pune",
    name: "Pune",
    state: "Maharashtra",
    aliases: ["Poona", "Pimpri-Chinchwad"],
    centerLat: 18.5204,
    centerLng: 73.8567,
    bbox: [73.6, 18.3, 74.3, 18.85],
    defaultZoom: 12,
    tileset: "maharashtra",
    useBounds: false,
    discoverySources: ["bhau-institute", "venture-center", "msins", "iitb-sine"],
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    aliases: ["Bangalore"],
    jobsLocation: "Bangalore",
    centerLat: 12.9716,
    centerLng: 77.5946,
    bbox: [77.3, 12.7, 77.95, 13.3],
    defaultZoom: 12,
    tileset: "bengaluru",
    useBounds: false,
    discoverySources: ["wellfound-bengaluru", "inc42-bengaluru"],
  },
  {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    aliases: ["Bombay", "Navi Mumbai", "Thane"],
    centerLat: 19.076,
    centerLng: 72.8777,
    bbox: [72.75, 18.85, 73.25, 19.35],
    defaultZoom: 12,
    tileset: "maharashtra",
    useBounds: false,
    discoverySources: ["91springboard", "msins"],
  },
];

// "Pune, Bengaluru and Mumbai" — for copy that lists every live city.
export function formatCityNames(list: CityConfig[] = cities): string {
  const names = list.map((c) => c.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Resolves free text ("Bangalore, India", "Navi Mumbai") to a city id.
export function matchCityId(raw: string | null | undefined): CityId | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  const hit = cities.find((c) => [c.id, c.name, ...c.aliases].some((n) => s.includes(n.toLowerCase())));
  return hit?.id ?? null;
}

export function isInsideCityBbox(city: CityConfig, lat: number, lng: number): boolean {
  const [west, south, east, north] = city.bbox;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}
