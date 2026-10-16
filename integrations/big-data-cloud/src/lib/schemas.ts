import { z } from 'zod';

export let timeZoneSchema = z
  .object({
    ianaTimeId: z.string().describe('IANA time zone identifier'),
    displayName: z.string().optional(),
    effectiveTimeZoneFull: z.string().optional(),
    effectiveTimeZoneShort: z.string().optional(),
    utcOffsetSeconds: z.number().optional(),
    utcOffset: z.string().optional().describe('UTC offset formatted by the provider'),
    isDaylightSavingTime: z.boolean().optional(),
    localTime: z.string().optional(),
    utcTime: z
      .string()
      .optional()
      .describe('Reference UTC time; omitted when no valid utcReference was supplied')
  })
  .passthrough();

export let asnSchema = z
  .object({
    asn: z.string().optional(),
    asnNumeric: z.number().optional(),
    organisation: z.string().optional(),
    name: z.string().optional(),
    registry: z.string().optional(),
    registeredCountry: z.string().optional(),
    registeredCountryName: z.string().optional(),
    registrationDate: z.string().optional(),
    registrationLastChange: z.string().optional(),
    totalIpv4Addresses: z.number().optional(),
    totalIpv4Prefixes: z.number().optional(),
    totalIpv6Prefixes: z.number().optional(),
    rank: z.number().optional()
  })
  .passthrough();

export let networkSchema = z
  .object({
    registry: z.string().optional(),
    registryStatus: z.string().optional(),
    registeredCountry: z.string().optional(),
    registeredCountryName: z.string().optional(),
    organisation: z.string().optional(),
    isReachableGlobally: z.boolean().optional(),
    isBogon: z.boolean().optional(),
    bgpPrefix: z.string().optional(),
    bgpPrefixNetworkAddress: z.string().optional(),
    bgpPrefixLastAddress: z.string().optional(),
    totalAddresses: z.number().optional(),
    carriers: z.array(asnSchema).optional(),
    viaCarriers: z.array(asnSchema).optional()
  })
  .passthrough();
