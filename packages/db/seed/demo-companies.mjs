// One-off demo seed: 69 real, well-known Mumbai/Pune companies (50 verified
// startups/VCs + 19 verified MNC India offices), researched with citations
// per-row (see field_evidence rows this script writes). Logos via
// DuckDuckGo's free icon service (icons.duckduckgo.com/ip3/{domain}.ico).
// Two prior choices didn't hold up, in case a third swap is ever needed:
// Clearbit's free Logo API is dead (no DNS record, likely retired after the
// 2023 HubSpot acquisition); Google's s2/favicons endpoint resolves fine
// but is commonly blocklisted by ad-blockers as a Google tracking pattern,
// which silently killed every logo in testing. apps/web/components/
// CompanyLogo.tsx also falls back to a visible initials avatar on any
// image-load failure now, regardless of provider — never render nothing.
// Honestly labeled precision='area' — we know the real neighborhood from a
// cited source, not a verified street address, so that's exactly what gets
// claimed; never 'exact'/'building'.
//
// status='published' and a manually-assigned score are deliberate here,
// bypassing the automated verify_score formula: these rows are
// human-verified with cited sources (the admin-override pattern the trust
// model already supports), not unverified pipeline output.
import fs from "node:fs";
import pg from "pg";

const envText = fs.readFileSync("D:/startup_atlas/.env", "utf8");
const connectionString = envText
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="))
  .slice("DATABASE_URL=".length)
  .trim();

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NOMINATIM_USER_AGENT = "startup-atlas-demo-seed/0.1 (contact: parthsohaney04@gmail.com)";

function geocodeQuery(area, cityId) {
  const cleaned = area.replace(/\([^)]*\)/g, "").trim().replace(/,$/, "");
  const parenMatch = area.match(/\(([^)]*)\)/);
  const cityOverride = parenMatch && /mumbai|pune|navi mumbai|thane/i.test(parenMatch[1]) ? parenMatch[1] : null;
  const cityPart = cityOverride ?? (cityId === "mumbai" ? "Mumbai" : "Pune");
  return `${cleaned}, ${cityPart}, India`;
}

async function geocodeArea(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for "${query}"`);
  const results = await res.json();
  if (results.length === 0) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

// name, domain, city, area, kind, description, sourceUrl
const companies = [
  ["Dream11", "dream11.com", "mumbai", "Bandra Kurla Complex, Bandra East", "startup", "Fantasy sports platform, flagship of Dream Sports", "https://www.dreamsports.group/newsroom/inside-dream11-office-sports-is-a-way-of-work-and-life/"],
  ["BookMyShow", "bookmyshow.com", "mumbai", "Juhu", "startup", "Online ticketing for movies, events and shows", "https://www.justdial.com/Mumbai/Bookmyshowcom-(Head-Office)-Near-Gazebo-House-Costa-Coffee-Juhu-Scheme-Juhu/022P8019311_BZDET"],
  ["Nykaa", "nykaa.com", "mumbai", "Prabhadevi", "startup", "Beauty and fashion e-commerce and retail", "https://www.nykaa.com/investor-contact"],
  ["PharmEasy", "pharmeasy.in", "mumbai", "Kurla West", "startup", "Online pharmacy and diagnostics delivery", "https://www.justdial.com/Mumbai/Pharmeasyin-Head-Office-Kurla-West"],
  ["Persistent Systems", "persistent.com", "pune", "Senapati Bapat Road, Model Colony", "startup", "IT services and digital engineering", "https://www.mappls.com/96fu62"],
  ["Quick Heal Technologies", "quickheal.com", "pune", "Viman Nagar", "startup", "Cybersecurity and antivirus software", "https://www.insiderbiz.in/company-map/QUICK-HEAL-TECHNOLOGIES-LIMITED"],
  ["FirstCry", "firstcry.com", "pune", "Baner", "startup", "E-commerce retailer for baby and kids products", "https://www.highperformr.ai/company/firstcry"],
  ["KPIT Technologies", "kpit.com", "pune", "Hinjewadi", "startup", "Automotive software and mobility engineering", "https://www.kpit.com/contact/"],
  ["Zensar Technologies", "zensar.com", "pune", "Kharadi", "startup", "IT services and digital transformation", "https://www.mappls.com/oz93lg"],
  ["Fractal Analytics", "fractal.ai", "mumbai", "Goregaon East", "startup", "AI and analytics consulting for enterprises", "https://www.justdial.com/Mumbai/Fractal-Analytics-Ltd-Goregaon-East"],
  ["upGrad", "upgrad.com", "mumbai", "Marol, Andheri East", "startup", "Online higher-education and upskilling platform", "https://craft.co/upgrad/locations"],
  ["Angel One", "angelone.in", "mumbai", "Andheri East (MIDC)", "startup", "Stock broking and fintech investment platform", "https://stockbroker.angelone.in/angel-one-ltd-mumbai-office-stock-broker-andheri-east-mumbai-528844/Home"],
  ["Justdial", "justdial.com", "mumbai", "Malad West", "startup", "Local search and business listings platform", "https://craft.co/just-dial/locations"],
  ["Pepperfry", "pepperfry.com", "mumbai", "Vikhroli West", "startup", "Online furniture and home decor marketplace", "https://www.zaubacorp.com/company/PEPPERFRY-LIMITED/U74990MH2011PLC220126"],
  ["Housing.com", "housing.com", "mumbai", "Powai", "startup", "Real estate listing and property search", "https://www.sulekha.com/housing-com-powai-mumbai-contact-address"],
  ["Purplle", "purplle.com", "mumbai", "Ghatkopar West", "startup", "Beauty and cosmetics e-commerce platform", "https://www.highperformr.ai/company/purplle-com"],
  ["Acko", "acko.com", "mumbai", "Goregaon East", "startup", "Digital-first general insurance company", "https://www.sulekha.com/acko-general-insurance-company-limited-goregaon-east-mumbai-contact-address"],
  ["Upstox", "upstox.com", "mumbai", "Dadar West", "startup", "Discount stock broking and trading platform", "https://tracxn.com/d/companies/upstox/__41x3SAyhVFyFAhgvwSxWQzI5JdqLGrTaA8XKWN37wcc"],
  ["Rebel Foods", "rebelfoods.com", "mumbai", "Bhandup West", "startup", "Cloud-kitchen operator (Faasos, Behrouz Biryani)", "https://www.dnb.com/business-directory/company-profiles.rebel_foods_private_limited.0c862967dd3a5da5eb2de5cccbd9ab85.html"],
  ["CleverTap", "clevertap.com", "mumbai", "Goregaon West", "startup", "Customer engagement and analytics platform", "https://www.zaubacorp.com/CLEVERTAP-PRIVATE-LIMITED-U72300MH2013PTC243608"],
  ["eClerx", "eclerx.com", "mumbai", "Fort", "startup", "Data analytics and process management outsourcing", "https://www.justdial.com/Mumbai/Eclerx-Services-Pvt-Ltd-Fort"],
  ["Firstsource Solutions", "firstsource.com", "mumbai", "Goregaon West", "startup", "BPO and customer experience management", "https://www.bseindia.com/xml-data/corpfiling/AttachHis/d3c40f2d-d015-45d8-aa56-f94266615834.pdf"],
  ["WNS Global Services", "wns.com", "mumbai", "Vikhroli West", "startup", "Business process management (BPM) services", "https://www.sulekha.com/wns-global-services-vikhroli-west-mumbai-contact-address"],
  ["Route Mobile", "routemobile.com", "mumbai", "Malad West", "startup", "Cloud communications (CPaaS) platform", "https://www.insiderbiz.in/company-map/ROUTE-MOBILE-LIMITED"],
  ["Mastek", "mastek.com", "mumbai", "Andheri East (SEEPZ)", "startup", "Enterprise cloud and digital transformation IT services", "https://www.mastek.com/contact-us/"],
  ["Motilal Oswal Financial Services", "motilaloswal.com", "mumbai", "Prabhadevi", "startup", "Stock broking, wealth and asset management", "https://www.sulekha.com/motilal-oswal-financial-services-limited-prabhadevi-mumbai-contact-address"],
  ["Edelweiss Financial Services", "edelweissfin.com", "mumbai", "Kalina, Santacruz East", "startup", "Diversified financial services group", "https://www.edelweissfin.com/contact-us/"],
  ["CoinDCX", "coindcx.com", "mumbai", "Marol Naka, Andheri (Andheri-Kurla Road)", "startup", "Cryptocurrency exchange platform", "https://www.clay.com/dossier/coindcx-headquarters-office-locations"],
  ["Icertis", "icertis.com", "pune", "Senapati Bapat Road", "startup", "Contract lifecycle management software", "https://www.icertis.com/contact-us/"],
  ["Cybage Software", "cybage.com", "pune", "Wadgaon Sheri", "startup", "Digital product engineering and IT outsourcing", "https://www.dnb.com/business-directory/company-profiles.cybage_software_private_limited.cde0e9f30fa9b6b8ef4f4d2f0ab013e7.html"],
  ["Blume Ventures", "blume.vc", "mumbai", "Byculla East", "vc", "Early-stage venture capital firm", "https://blume.vc/contact-us/"],
  ["Kae Capital", "kae-capital.com", "mumbai", "Nariman Point", "vc", "Early-stage venture capital firm", "https://kae-capital.com/about-us/"],
  ["Matrix Partners India", "matrix.in", "mumbai", "Worli", "vc", "Venture capital firm", "https://matrix.in/pages/our-offices"],
  ["Nexus Venture Partners", "nexusvp.com", "mumbai", "Bandra Kurla Complex, Bandra East", "vc", "Venture capital firm", "https://nexusvp.com/team/"],
  ["True North", "truenorth.co.in", "mumbai", "Santacruz East", "vc", "Private equity investment firm", "https://www.truenorth.co.in/contact/"],
  ["Multiples Alternate Asset Management", "multiplesequity.com", "mumbai", "Worli", "vc", "Private equity and growth investment firm", "https://www.justdial.com/jdmart/Mumbai/Multiples-Alternate-Asset-Management-Pvt-Ltd-Worli"],
  ["Aavishkaar Capital", "aavishkaarcapital.in", "mumbai", "Bandra Kurla Complex, Bandra East", "vc", "Impact-focused venture capital firm", "https://aavishkaarcapital.in/contact-us/"],
  ["Sixth Sense Ventures", "sixthsenseventures.com", "mumbai", "Bandra Kurla Complex", "vc", "Consumer-brands focused venture capital firm", "https://sixthsenseventures.com/contact/"],
  ["Norwest Venture Partners", "nvp.com", "mumbai", "Nariman Point", "vc", "Global venture capital and growth equity firm", "https://www.nvp.com/india/"],
  ["Lightbox", "lightbox.vc", "mumbai", "Lower Parel", "vc", "Consumer-tech venture capital firm", "https://lightbox.vc/team"],
  ["Mswipe Technologies", "mswipe.com", "mumbai", "Lower Parel", "startup", "Card payments (POS/EDC) network provider", "https://www.mswipe.com/contact-us"],
  ["Turtlemint", "turtlemint.com", "mumbai", "Marol, Andheri East", "startup", "Digital insurance distribution platform", "https://www.highperformr.ai/company/turtlemint"],
  ["Tech Mahindra", "techmahindra.com", "pune", "Erandwane", "startup", "IT services and BPO, part of Mahindra Group", "https://www.mappls.com/wsycy1"],
  ["Bajaj Finserv", "bajajfinserv.in", "pune", "Viman Nagar", "startup", "Consumer/SME lending and financial services", "https://www.dnb.com/business-directory/company-profiles.bajaj_finserv_limited.58308486fc3cc501de35d173802eb641.html"],
  ["Bajaj Allianz General Insurance", "bajajallianz.com", "pune", "Yerawada", "startup", "General insurance provider (Bajaj-Allianz JV)", "https://www.justdial.com/Pune/Bajaj-Allianz-Life-Insurance-Co-Ltd-Yerawada"],
  ["Coverfox Insurance", "coverfox.com", "mumbai", "Chandivali, Andheri East", "startup", "Online insurance comparison and broking", "https://www.zaubacorp.com/COVERFOX-INSURANCE-BROKING-PRIVATE-LIMITED-U66000MH2013PTC243810"],
  ["Nazara Technologies", "nazara.com", "mumbai", "Nariman Point", "startup", "Gaming and esports company", "https://www.zaubacorp.com/company-map/NAZARA-TECHNOLOGIES-LIMITED/L72900MH1999PLC122970/India"],
  ["LTIMindtree", "ltimindtree.com", "mumbai", "Powai", "startup", "IT services and consulting (L&T/Mindtree merger)", "https://www.justdial.com/jdmart/Mumbai/Ltimindtree-Ltd-Powai/022P8900101_BZDET/catalogue"],
  ["Sula Vineyards", "sulavineyards.com", "mumbai", "Andheri East", "startup", "Winemaker and wine-tourism company", "https://sulavineyards.com/files/0424/Grant%20of%20ESOP%20under%20ESOS%202023.pdf"],
  ["Bewakoof", "bewakoof.com", "mumbai", "Andheri East", "startup", "Direct-to-consumer fashion and apparel brand", "https://www.justdial.com/Mumbai/Bewakoofcom-Corporate-Office-Andheri-East"],
  // MNC offices
  ["Google", "google.com", "mumbai", "Bandra Kurla Complex (FIFC Building)", "startup", "Search, ads and cloud technology (India office)", "https://www.jeewangarg.com/blog/list-of-google-offices-india"],
  ["Microsoft", "microsoft.com", "pune", "Yerawada (Commerzone IT Park)", "startup", "Enterprise software and cloud (India office)", "https://www.mappls.com/mvra2d"],
  ["Amazon", "amazon.com", "mumbai", "Bandra Kurla Complex (Godrej BKC)", "startup", "E-commerce and cloud (Prime Video/ads office)", "https://www.aboutamazon.in/workplace/corporate-offices"],
  ["Adobe", "adobe.com", "mumbai", "Bandra Kurla Complex", "startup", "Creative and marketing software (regional hub)", "https://www.justdial.com/Mumbai/Adobe-Systems-India-Pvt-Ltd"],
  ["IBM", "ibm.com", "pune", "Kharadi (EON IT Park)", "startup", "IT services, consulting and software", "https://kharadipune.com/ibm-pune/"],
  ["SAP Labs India", "sap.com", "pune", "Kharadi (International Tech Park)", "startup", "Enterprise software R&D lab", "https://www.businessworld.in/article/sap-labs-expands-footprint-in-india-opens-new-pune-office-494837"],
  ["Barclays", "home.barclays", "pune", "Kharadi (Gera Commerzone SEZ)", "startup", "Global banking — technology & operations center", "https://cleartax.in/f/company/barclays-global-service-centre-private-limited/U72200PN2007FTC132479/"],
  ["Deutsche Bank", "db.com", "pune", "Yerawada (Business Bay)", "startup", "Global banking — technology & operations center", "https://www.justdial.com/Pune/Deutsche-Bank-Group-Yerawada"],
  ["JPMorgan Chase", "jpmorganchase.com", "mumbai", "Goregaon East (Nirlon Knowledge Park)", "startup", "Global bank — technology & corporate campus", "https://www.jpmorganchase.com/newsroom/press-releases/2023/jpmorgan-chase-opens-new-offices-in-mumbai-and-bengaluru"],
  ["UBS", "ubs.com", "pune", "Kharadi (EON Free Zone)", "startup", "Global bank — technology & operations center", "https://www.ubs.com/global/en/media/display-page-ndp/en-20181025-second-office-in-pune.html"],
  ["Cognizant", "cognizant.com", "pune", "Hinjewadi", "startup", "IT services and consulting", "https://www.mappls.com/n8zlo5"],
  ["Capgemini", "capgemini.com", "mumbai", "Airoli (Navi Mumbai)", "startup", "IT services and consulting", "https://www.capgemini.com/in-en/careers/lets-connect/our-offices/capgemini-mumbai/"],
  ["Accenture", "accenture.com", "mumbai", "Airoli (Navi Mumbai)", "startup", "IT services and management consulting", "https://www.accenture.com/us-en/about/locations/office-details?loc=mumbai"],
  ["Wipro", "wipro.com", "pune", "Hinjewadi (Rajiv Gandhi Infotech Park)", "startup", "IT services and consulting", "https://www.wipro.com/locations/"],
  ["Infosys", "infosys.com", "pune", "Hinjewadi (Rajiv Gandhi Infotech Park)", "startup", "IT services and consulting", "https://www.infosys.com/contact/country/asia-pacific-infosys.html"],
  ["EY", "ey.com", "mumbai", "Dadar West (The Ruby)", "startup", "Professional services — audit, tax, consulting", "https://www.ey.com/en_in/locations/india"],
  ["Deloitte", "deloitte.com", "mumbai", "Prabhadevi", "startup", "Professional services — audit, tax, consulting", "https://www.justdial.com/Mumbai/Deloitte-Touche-Tohmatsu-India-Pvt-Ltd-Prabhadevi"],
  ["Bosch Global Software Technologies", "bosch.com", "pune", "Koregaon Park", "startup", "Automotive/software engineering R&D center", "https://www.bosch-softwaretechnologies.com/en/locations/"],
  ["Mercedes-Benz R&D India", "mercedes-benz.com", "pune", "Hinjewadi (Embassy Tech Zone)", "startup", "Automotive engineering and IT R&D center", "https://group.mercedes-benz.com/careers/about-us/locations/location-detail-page-18176.html"],
].map(([name, domain, city, area, kind, description, sourceUrl]) => ({
  name, domain, city, area, kind, description, sourceUrl,
}));

const client = new pg.Client({ connectionString });
await client.connect();

let inserted = 0;
let failed = 0;

for (const c of companies) {
  const query = geocodeQuery(c.area, c.city);
  let coords;
  try {
    coords = await geocodeArea(query);
  } catch (err) {
    console.warn(`[skip] geocode error for "${c.name}" (${query}): ${err.message}`);
    failed++;
    await new Promise((r) => setTimeout(r, 1100));
    continue;
  }
  await new Promise((r) => setTimeout(r, 1100)); // respect Nominatim's 1 req/s

  if (!coords) {
    console.warn(`[skip] geocode failed for "${c.name}" (${query})`);
    failed++;
    continue;
  }

  const slug = slugify(c.name);
  const logoUrl = `https://icons.duckduckgo.com/ip3/${c.domain}.ico`;

  try {
    await client.query("BEGIN");

    const brandRes = await client.query(
      `insert into brands (city_id, slug, name, kind, tagline, description, website, domain, logo_url, score, status, last_verified_at)
       values ($1,$2,$3,$4,$5,$5,$6,$7,$8,85,'published',now())
       on conflict (city_id, slug) do update set
         kind = excluded.kind, tagline = excluded.tagline, description = excluded.description,
         website = excluded.website, domain = excluded.domain, logo_url = excluded.logo_url,
         score = excluded.score, status = excluded.status, last_verified_at = now(), updated_at = now()
       returning id`,
      [c.city, slug, c.name, c.kind, c.description, `https://${c.domain}`, c.domain, logoUrl]
    );
    const brandId = brandRes.rows[0].id;

    await client.query(`delete from offices where brand_id = $1`, [brandId]);
    await client.query(
      `insert into offices (brand_id, city_id, geom, precision, area, location_source)
       values ($1,$2, ST_SetSRID(ST_MakePoint($3,$4),4326), 'area', $5, 'manual-demo-seed')`,
      [brandId, c.city, coords.lng, coords.lat, c.area]
    );

    await client.query(
      `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
       values ('brand', $1, 'area', $2, $3, 80)`,
      [brandId, c.area, c.sourceUrl]
    );

    await client.query("COMMIT");
    console.log(`[ok] ${c.name} -> ${c.area} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    inserted++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[error] ${c.name}:`, err.message);
    failed++;
  }
}

console.log(`\nDone: ${inserted} inserted, ${failed} failed/skipped (of ${companies.length} total).`);
await client.end();
