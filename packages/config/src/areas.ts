// Fixed locality lists per city, for the area filter and the /submit area
// picker. The filter otherwise only knows areas that already have a company
// in the DB (apps/web/lib/snapshot.ts), which leaves it empty for a new city.
//
// Coordinates are locality centres, used only to move the map when an area
// is picked — never as a company's pin. Looked up via OpenStreetMap
// Nominatim (bounded to the city bbox) on 2026-09-14; where the top hit was
// a single point (a station, bus stop, bank) rather than the locality, the
// centre was set by hand to the approximate middle of the locality.
export type CityArea = { name: string; lat: number; lng: number };

export const BENGALURU_AREAS: CityArea[] = [
  { name: "Banashankari", lat: 12.9278, lng: 77.5566 },
  { name: "Banaswadi", lat: 13.0142, lng: 77.6519 },
  { name: "Bannerghatta Road", lat: 12.895, lng: 77.599 },
  { name: "Basavanagudi", lat: 12.9417, lng: 77.5755 },
  { name: "Bellandur", lat: 12.932, lng: 77.6843 },
  { name: "Bommanahalli", lat: 12.9035, lng: 77.623 },
  { name: "Brookefield", lat: 12.9652, lng: 77.7179 },
  { name: "BTM Layout", lat: 12.914, lng: 77.6103 },
  { name: "CV Raman Nagar", lat: 12.9856, lng: 77.6681 },
  { name: "Devanahalli", lat: 13.2484, lng: 77.7134 },
  { name: "Domlur", lat: 12.9625, lng: 77.6382 },
  { name: "Electronic City", lat: 12.8452, lng: 77.6602 },
  { name: "Frazer Town", lat: 12.9976, lng: 77.6137 },
  { name: "HBR Layout", lat: 13.032, lng: 77.6281 },
  { name: "Hebbal", lat: 13.0382, lng: 77.5919 },
  { name: "Hennur", lat: 13.0371, lng: 77.6414 },
  { name: "HSR Layout", lat: 12.9116, lng: 77.6389 },
  { name: "Indiranagar", lat: 12.9733, lng: 77.6405 },
  { name: "Jayanagar", lat: 12.9293, lng: 77.5824 },
  { name: "JP Nagar", lat: 12.9097, lng: 77.5866 },
  { name: "Kadubeesanahalli", lat: 12.939, lng: 77.6964 },
  { name: "Kalyan Nagar", lat: 13.0221, lng: 77.6403 },
  { name: "Koramangala", lat: 12.9357, lng: 77.6241 },
  { name: "KR Puram", lat: 13.0075, lng: 77.6959 },
  { name: "Mahadevapura", lat: 12.9916, lng: 77.7038 },
  { name: "Malleshwaram", lat: 13.0027, lng: 77.5703 },
  { name: "Marathahalli", lat: 12.9553, lng: 77.6984 },
  { name: "MG Road", lat: 12.9755, lng: 77.6068 },
  { name: "Nagawara", lat: 13.0437, lng: 77.6211 },
  { name: "Peenya", lat: 13.0331, lng: 77.5332 },
  { name: "Rajajinagar", lat: 13.0005, lng: 77.5496 },
  { name: "Richmond Town", lat: 12.9636, lng: 77.6016 },
  { name: "RT Nagar", lat: 13.0227, lng: 77.5957 },
  { name: "Sadashivanagar", lat: 13.011, lng: 77.5809 },
  { name: "Sanjaynagar", lat: 13.0295, lng: 77.5785 },
  { name: "Sarjapur Road", lat: 12.912, lng: 77.678 },
  { name: "Shivajinagar", lat: 12.9855, lng: 77.6054 },
  { name: "Ulsoor", lat: 12.9779, lng: 77.6247 },
  { name: "Vasanth Nagar", lat: 12.9922, lng: 77.5915 },
  { name: "Vijayanagar", lat: 12.971, lng: 77.5374 },
  { name: "Whitefield", lat: 12.9698, lng: 77.75 },
  { name: "Yelahanka", lat: 13.1007, lng: 77.5963 },
  { name: "Yeshwanthpur", lat: 13.0177, lng: 77.5555 },
];
