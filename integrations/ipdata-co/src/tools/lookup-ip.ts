import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let asnSchema = z
  .object({
    asn: z.string().describe('Autonomous System Number'),
    name: z.string().describe('AS organization name'),
    domain: z.string().describe('AS organization domain'),
    route: z.string().describe('AS route'),
    type: z.string().describe('Usage type (e.g. isp, hosting, business, education)')
  })
  .describe('ASN information');

let languageSchema = z.object({
  name: z.string().describe('Language name'),
  native: z.string().describe('Language name in native script'),
  code: z.string().describe('ISO 639-1 language code')
});

let currencySchema = z.object({
  name: z.string().describe('Currency name'),
  code: z.string().describe('ISO 4217 currency code'),
  symbol: z.string().describe('Currency symbol'),
  native: z.string().describe('Currency symbol in native format'),
  plural: z.string().describe('Plural form of currency name')
});

let timezoneSchema = z.object({
  name: z.string().describe('IANA timezone name'),
  abbr: z.string().describe('Timezone abbreviation'),
  offset: z.string().describe('UTC offset'),
  isDst: z.boolean().describe('Whether daylight saving time is active'),
  currentTime: z.string().describe('Current time in the timezone')
});

let threatSchema = z.object({
  isTor: z.boolean().describe('Whether the IP is a known Tor exit node'),
  isIcloudRelay: z.boolean().describe('Whether the IP is an iCloud Private Relay address'),
  isProxy: z.boolean().describe('Whether the IP is a known proxy'),
  isDatacenter: z.boolean().describe('Whether the IP belongs to a datacenter'),
  isAnonymous: z.boolean().describe('Whether the IP is used for anonymous access'),
  isKnownAttacker: z.boolean().describe('Whether the IP is a known attacker'),
  isKnownAbuser: z.boolean().describe('Whether the IP is a known abuser'),
  isThreat: z.boolean().describe('Whether the IP is considered a threat'),
  isBogon: z.boolean().describe('Whether the IP is a bogon (unallocated) address')
});

let carrierSchema = z.object({
  name: z.string().describe('Mobile carrier name'),
  mcc: z.string().describe('Mobile Country Code'),
  mnc: z.string().describe('Mobile Network Code')
});

let companySchema = z.object({
  name: z.string().describe('Company or organization name'),
  domain: z.string().describe('Company domain'),
  type: z.string().describe('Organization type (e.g. isp, business, hosting, education)')
});

export let lookupIp = SlateTool.create(spec, {
  name: 'Lookup IP',
  key: 'lookup_ip',
  description: `Look up comprehensive geolocation and enrichment data for any IPv4 or IPv6 address. Returns location (country, region, city, coordinates, postal code), threat intelligence, ASN, company/organization, timezone, currency, languages, and mobile carrier data. Omit the IP address to look up the caller's own IP.`,
  constraints: ['Free API keys are limited to 1,500 requests per day.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z
        .string()
        .optional()
        .describe("IPv4 or IPv6 address to look up. Omit to look up the caller's own IP."),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to return (e.g. ["ip", "city", "country_name", "threat"]). Omit to return all fields.'
        )
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The looked-up IP address'),
      isEu: z.boolean().optional().describe('Whether the IP is located in an EU country'),
      city: z.string().optional().describe('City name'),
      region: z.string().optional().describe('Region or state name'),
      regionCode: z.string().optional().describe('Region code'),
      countryName: z.string().optional().describe('Country name'),
      countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
      continentName: z.string().optional().describe('Continent name'),
      continentCode: z.string().optional().describe('Continent code'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      postalCode: z.string().optional().describe('Postal or ZIP code'),
      callingCode: z.string().optional().describe('International calling code'),
      flag: z.string().optional().describe('URL to the country flag image'),
      emojiFlag: z.string().optional().describe('Country flag emoji'),
      asn: asnSchema.optional(),
      languages: z
        .array(languageSchema)
        .optional()
        .describe('Languages spoken in the country'),
      currency: currencySchema.optional(),
      timezone: timezoneSchema.optional(),
      threat: threatSchema.optional(),
      carrier: carrierSchema.optional(),
      company: companySchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      useEuEndpoint: ctx.config.useEuEndpoint
    });

    let result = await client.lookupIp(ctx.input.ipAddress, ctx.input.fields);

    let locationParts = [result.city, result.region, result.countryName].filter(Boolean);
    let locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'unknown location';

    return {
      output: result,
      message: `Looked up IP **${result.ip}** — located in **${locationStr}**${result.threat?.isThreat ? ' (flagged as threat)' : ''}.`
    };
  })
  .build();
