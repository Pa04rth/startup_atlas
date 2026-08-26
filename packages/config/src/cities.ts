export type CityConfig = {
  id: "pune" | "mumbai";
  name: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  useBounds: boolean; // hybrid switch: false = snapshot, true = bounds+Typesense
  discoverySources: string[];
};

export const cities: CityConfig[] = [
  {
    id: "pune",
    name: "Pune",
    centerLat: 18.5204,
    centerLng: 73.8567,
    defaultZoom: 12,
    useBounds: false,
    discoverySources: ["bhau-institute", "venture-center", "msins", "iitb-sine"],
  },
  {
    id: "mumbai",
    name: "Mumbai",
    centerLat: 19.076,
    centerLng: 72.8777,
    defaultZoom: 12,
    useBounds: false,
    discoverySources: ["91springboard", "msins"],
  },
];
