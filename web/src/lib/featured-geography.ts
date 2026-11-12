import { m49RegionByCountry } from "@/lib/m49-region-data";

// Profile-ready codes from the Persona API public beta audit (2026-09-28).
const profileReady = new Set("AD AE AF AG AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BM BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KM KN KP KR KW KZ LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MQ MR MT MU MV MW MX MZ NA NC NE NG NI NL NO NP NR NZ PA PE PF PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TL TN TR TT TW TZ UA UG US UY UZ VC VE VI VN VU WS YE YT ZA ZM ZW".split(" "));

function regionKey(code: string) {
  const region = m49RegionByCountry[code];
  return region ? `${region[0]}-${region[2] || region[1]}` : null;
}

export function featuredCountries(rawCountry: string | null): [string, string, string] {
  const visitor = rawCountry?.toUpperCase() ?? "CG";
  const key = regionKey(visitor) ?? regionKey("CG");
  const continent = m49RegionByCountry[visitor]?.[0] ?? "002";
  const local = [...profileReady].filter((code) => regionKey(code) === key).sort();
  const wider = [...profileReady].filter((code) => m49RegionByCountry[code]?.[0] === continent).sort();
  const center = profileReady.has(visitor) ? visitor : local[0] ?? wider[0] ?? "CG";
  const peers = [...local, ...wider].filter((code, index, list) => code !== center && list.indexOf(code) === index);
  const centerIndex = local.indexOf(center);
  const left = local.length > 1 ? local[(centerIndex - 1 + local.length) % local.length] : peers[0] ?? center;
  const nextLocal = local.length > 2 ? local[(centerIndex + 1) % local.length] : null;
  const right = nextLocal && nextLocal !== left ? nextLocal : peers.find((code) => code !== left) ?? center;
  return [left, center, right];
}
