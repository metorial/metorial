import type { ZohoRegion } from '@slates/oauth-zoho';
import { createApiServiceError } from 'slates';

export let ZOHO_API_ORIGINS = {
  us: 'https://www.zohoapis.com',
  eu: 'https://www.zohoapis.eu',
  in: 'https://www.zohoapis.in',
  au: 'https://www.zohoapis.com.au',
  jp: 'https://www.zohoapis.jp',
  ca: 'https://www.zohoapis.ca',
  sa: 'https://www.zohoapis.sa',
  uk: 'https://www.zohoapis.uk'
} as const satisfies Record<ZohoRegion, `https://${string}`>;

let deskBaseUrls = {
  us: 'https://desk.zoho.com',
  eu: 'https://desk.zoho.eu',
  in: 'https://desk.zoho.in',
  au: 'https://desk.zoho.com.au',
  jp: 'https://desk.zoho.jp',
  ca: 'https://desk.zohocloud.ca',
  sa: 'https://desk.zoho.sa',
  uk: 'https://desk.zoho.uk'
} as const satisfies Record<ZohoRegion, `https://${string}`>;

let peopleBaseUrls = {
  us: 'https://people.zoho.com',
  eu: 'https://people.zoho.eu',
  in: 'https://people.zoho.in',
  au: 'https://people.zoho.com.au',
  jp: 'https://people.zoho.jp',
  ca: 'https://people.zohocloud.ca',
  sa: 'https://people.zoho.sa',
  uk: 'https://people.zoho.uk'
} as const satisfies Record<ZohoRegion, `https://${string}`>;

let projectsBaseUrls: Partial<Record<ZohoRegion, `https://${string}`>> = {
  us: 'https://projectsapi.zoho.com',
  eu: 'https://projectsapi.zoho.eu',
  in: 'https://projectsapi.zoho.in',
  au: 'https://projectsapi.zoho.com.au',
  jp: 'https://projectsapi.zoho.jp',
  ca: 'https://projectsapi.zohocloud.ca'
};

export type ZohoSupportedRegion = keyof typeof ZOHO_API_ORIGINS;

export let getDeskBaseUrl = (region: ZohoSupportedRegion): string => deskBaseUrls[region];
export let getPeopleBaseUrl = (region: ZohoSupportedRegion): string => peopleBaseUrls[region];
export let getProjectsBaseUrl = (region: ZohoSupportedRegion): string => {
  let baseUrl = projectsBaseUrls[region];
  if (!baseUrl) {
    throw createApiServiceError(
      'Zoho Projects V3 is not available in this account region yet.'
    );
  }
  return baseUrl;
};
