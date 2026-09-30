import { z } from 'zod';
import type { ApiRecord } from './client';

export const brandProfileSchema = z.object({
  brand: z.object({
    domain: z.string(),
    title: z.string(),
    slogan: z.string().optional(),
    description: z.string().optional(),
    logo: z.string().optional(),
    colors: z.array(z.object({ hex: z.string(), name: z.string().optional() })),
    socials: z.array(z.object({ type: z.string(), url: z.string() })),
    industries: z.array(
      z.object({ industry: z.string(), subindustry: z.string().optional() })
    ),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    stockTicker: z.string().optional()
  })
});

const isString = (value: unknown): value is string => typeof value === 'string';

// The REST brand record has nested industries and a links object; the official
// domain-profile contract presents those as lists and selects one logo.
export const mapBrandProfile = (
  response: ApiRecord,
  domain: string
): z.infer<typeof brandProfileSchema> => {
  const brand = response.brand ?? {};
  const logos: ApiRecord[] = Array.isArray(brand.logos) ? brand.logos : [];
  const logo =
    logos.find(entry => entry.type === 'logo' && isString(entry.url)) ??
    logos.find(entry => isString(entry.url));
  const address = brand.address ?? {};
  const location = [address.city, address.state_province, address.country]
    .filter(isString)
    .filter(Boolean)
    .join(', ');
  return {
    brand: {
      domain: isString(brand.domain) ? brand.domain : domain,
      title: isString(brand.title) ? brand.title : domain,
      ...(isString(brand.slogan) ? { slogan: brand.slogan } : {}),
      ...(isString(brand.description) ? { description: brand.description } : {}),
      ...(logo ? { logo: logo.url } : {}),
      colors: (Array.isArray(brand.colors) ? brand.colors : [])
        .filter((entry: ApiRecord) => isString(entry.hex))
        .map((entry: ApiRecord) => ({
          hex: entry.hex,
          ...(isString(entry.name) ? { name: entry.name } : {})
        })),
      socials: (Array.isArray(brand.socials) ? brand.socials : [])
        .filter((entry: ApiRecord) => isString(entry.type) && isString(entry.url))
        .map((entry: ApiRecord) => ({ type: entry.type, url: entry.url })),
      industries: (Array.isArray(brand.industries?.eic) ? brand.industries.eic : [])
        .filter((entry: ApiRecord) => isString(entry.industry))
        .map((entry: ApiRecord) => ({
          industry: entry.industry,
          ...(isString(entry.subindustry) ? { subindustry: entry.subindustry } : {})
        })),
      links: Object.entries(brand.links ?? {})
        .filter((entry): entry is [string, string] => isString(entry[1]))
        .map(([label, url]) => ({ label, url })),
      ...(isString(brand.email) ? { email: brand.email } : {}),
      ...(isString(brand.phone) ? { phone: brand.phone } : {}),
      ...(location ? { location } : {}),
      ...(isString(brand.stock?.ticker) ? { stockTicker: brand.stock.ticker } : {})
    }
  };
};
