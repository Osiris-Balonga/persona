import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { featuredCountries } from "@/lib/featured-geography";
import { serverConfig } from "@/lib/server-config";
import { featuredPersonWithPortrait } from "@/lib/featured-person-selection";
import type { PortraitImageVariants } from "@/lib/portrait-image";

export type FeaturedPerson = {
  id: string;
  name: { first: string; last: string; full: string };
  nationality: string;
  dob: { age: number };
  location: { city: string | null; country: { code: string; name: string } };
  email: string | null;
  phone: string | null;
  phoneDisplay: string | null;
  picture: PortraitImageVariants;
};

const cache = new Map<string, { expiresAt: number; people: FeaturedPerson[] }>();
const pending = new Map<string, Promise<FeaturedPerson[]>>();
const duration = 24 * 60 * 60 * 1000;

function isPerson(value: unknown): value is Omit<FeaturedPerson, "phoneDisplay"> {
  if (!value || typeof value !== "object") return false;
  const person = value as Partial<FeaturedPerson>;
  return typeof person.id === "string" && typeof person.name?.full === "string"
    && typeof person.dob?.age === "number" && typeof person.location?.country?.code === "string";
}

async function fetchPerson(code: string): Promise<FeaturedPerson> {
  const query = new URLSearchParams({
    count: "3",
    nationality: code,
    ageGroup: "adult",
    emailDomain: "persona.com",
    seed: `persona-web-featured-v1-${code}`,
  });
  const response = await fetch(`${serverConfig.apiUpstreamOrigin}/people?${query}`, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Persona API ${response.status} for ${code}`);
  const data: unknown = await response.json();
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results) || !results.every(isPerson) || results.length === 0) throw new Error(`Invalid Persona API response for ${code}`);
  const person = featuredPersonWithPortrait(results);
  if (!person) throw new Error(`No portrait in Persona API response for ${code}`);
  let phoneDisplay = person.phone;
  if (person.phone) {
    try { phoneDisplay = parsePhoneNumberFromString(person.phone)?.formatInternational() ?? person.phone; }
    catch { /* Keep the API value if the number is outside current formatting metadata. */ }
  }
  return { ...person, phoneDisplay };
}

export async function getFeaturedPeople(country: string | null): Promise<FeaturedPerson[]> {
  const countries = featuredCountries(country);
  const key = countries.join("-");
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.people;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = Promise.all(countries.map(fetchPerson))
    .then((people) => {
      cache.set(key, { expiresAt: Date.now() + duration, people });
      return people;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
