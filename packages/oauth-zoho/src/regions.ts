import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let ZOHO_REGION_CODES = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa', 'uk'] as const;

export type ZohoRegion = (typeof ZOHO_REGION_CODES)[number];

export type ZohoRegionMetadata = {
  code: ZohoRegion;
  callbackLocation: string;
  accountsOrigin: `https://${string}`;
};

export let ZOHO_REGION_METADATA = {
  us: {
    code: 'us',
    callbackLocation: 'us',
    accountsOrigin: 'https://accounts.zoho.com'
  },
  eu: {
    code: 'eu',
    callbackLocation: 'eu',
    accountsOrigin: 'https://accounts.zoho.eu'
  },
  in: {
    code: 'in',
    callbackLocation: 'in',
    accountsOrigin: 'https://accounts.zoho.in'
  },
  au: {
    code: 'au',
    callbackLocation: 'au',
    accountsOrigin: 'https://accounts.zoho.com.au'
  },
  jp: {
    code: 'jp',
    callbackLocation: 'jp',
    accountsOrigin: 'https://accounts.zoho.jp'
  },
  ca: {
    code: 'ca',
    callbackLocation: 'ca',
    accountsOrigin: 'https://accounts.zohocloud.ca'
  },
  sa: {
    code: 'sa',
    callbackLocation: 'sa',
    accountsOrigin: 'https://accounts.zoho.sa'
  },
  uk: {
    code: 'uk',
    callbackLocation: 'uk',
    accountsOrigin: 'https://accounts.zoho.uk'
  }
} as const satisfies Record<ZohoRegion, ZohoRegionMetadata>;

export let ZOHO_CALLBACK_LOCATION_ALIASES = Object.fromEntries(
  ZOHO_REGION_CODES.map(region => [ZOHO_REGION_METADATA[region].callbackLocation, region])
) as Record<string, ZohoRegion>;

let ZOHO_ACCOUNTS_ORIGIN_REGIONS = Object.fromEntries(
  ZOHO_REGION_CODES.map(region => [ZOHO_REGION_METADATA[region].accountsOrigin, region])
) as Record<string, ZohoRegion>;

let ZOHO_REGION_SET = new Set<string>(ZOHO_REGION_CODES);

let invalidRegionConfiguration = (message: string) =>
  createApiServiceError(`Invalid Zoho OAuth region configuration: ${message}`, {
    reason: 'zoho_oauth_region_configuration'
  });

export let validateZohoSupportedRegions = (
  supportedRegions: readonly ZohoRegion[]
): readonly ZohoRegion[] => {
  if (!Array.isArray(supportedRegions) || supportedRegions.length === 0) {
    throw invalidRegionConfiguration('provide at least one supported region.');
  }

  let seen = new Set<string>();
  for (let region of supportedRegions as readonly string[]) {
    if (!ZOHO_REGION_SET.has(region)) {
      throw invalidRegionConfiguration(`unsupported region "${region}".`);
    }

    if (seen.has(region)) {
      throw invalidRegionConfiguration(`duplicate region "${region}".`);
    }
    seen.add(region);
  }

  return supportedRegions;
};

export let createZohoRegionSchema = <const Regions extends readonly ZohoRegion[]>(
  supportedRegions: Regions
) => {
  validateZohoSupportedRegions(supportedRegions);
  return z.enum([supportedRegions[0]!, ...supportedRegions.slice(1)] as [
    Regions[number],
    ...Regions[number][]
  ]);
};

export let getZohoRegionForCallbackLocation = (location: unknown) =>
  typeof location === 'string' ? ZOHO_CALLBACK_LOCATION_ALIASES[location] : undefined;

export let getZohoRegionForAccountsOrigin = (accountsOrigin: unknown) =>
  typeof accountsOrigin === 'string'
    ? ZOHO_ACCOUNTS_ORIGIN_REGIONS[accountsOrigin]
    : undefined;
