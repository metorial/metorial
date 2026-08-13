import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  createZohoRegionSchema,
  getZohoRegionForAccountsOrigin,
  getZohoRegionForCallbackLocation,
  ZOHO_CALLBACK_LOCATION_ALIASES,
  ZOHO_REGION_CODES,
  ZOHO_REGION_METADATA
} from './regions';

let expectedRegions = {
  us: { code: 'us', callbackLocation: 'us', accountsOrigin: 'https://accounts.zoho.com' },
  eu: { code: 'eu', callbackLocation: 'eu', accountsOrigin: 'https://accounts.zoho.eu' },
  in: { code: 'in', callbackLocation: 'in', accountsOrigin: 'https://accounts.zoho.in' },
  au: {
    code: 'au',
    callbackLocation: 'au',
    accountsOrigin: 'https://accounts.zoho.com.au'
  },
  jp: { code: 'jp', callbackLocation: 'jp', accountsOrigin: 'https://accounts.zoho.jp' },
  ca: {
    code: 'ca',
    callbackLocation: 'ca',
    accountsOrigin: 'https://accounts.zohocloud.ca'
  },
  sa: { code: 'sa', callbackLocation: 'sa', accountsOrigin: 'https://accounts.zoho.sa' },
  uk: { code: 'uk', callbackLocation: 'uk', accountsOrigin: 'https://accounts.zoho.uk' }
} as const;

describe('Zoho regions', () => {
  it('defines the canonical Accounts origin and callback location for every region', () => {
    expect(ZOHO_REGION_CODES).toEqual(['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa', 'uk']);
    expect(ZOHO_REGION_METADATA).toEqual(expectedRegions);
  });

  it('maps only exact callback locations to canonical regions', () => {
    for (let region of ZOHO_REGION_CODES) {
      expect(ZOHO_CALLBACK_LOCATION_ALIASES[region]).toBe(region);
      expect(getZohoRegionForCallbackLocation(expectedRegions[region].callbackLocation)).toBe(
        region
      );
    }

    expect(getZohoRegionForCallbackLocation('US')).toBeUndefined();
    expect(getZohoRegionForCallbackLocation(' us ')).toBeUndefined();
    expect(getZohoRegionForCallbackLocation('sg')).toBeUndefined();
  });

  it('maps only exact canonical Accounts origins to regions', () => {
    for (let region of ZOHO_REGION_CODES) {
      expect(getZohoRegionForAccountsOrigin(expectedRegions[region].accountsOrigin)).toBe(
        region
      );
    }

    expect(getZohoRegionForAccountsOrigin('https://accounts.zoho.com/')).toBeUndefined();
    expect(getZohoRegionForAccountsOrigin('http://accounts.zoho.com')).toBeUndefined();
    expect(
      getZohoRegionForAccountsOrigin('https://accounts.zoho.com.evil.test')
    ).toBeUndefined();
  });

  it('creates a schema restricted to the configured integration subset', () => {
    let schema = createZohoRegionSchema(['us', 'eu', 'ca'] as const);

    expect(schema.options).toEqual(['us', 'eu', 'ca']);
    expect(schema.parse('eu')).toBe('eu');
    expect(schema.safeParse('in').success).toBe(false);
  });

  it.each([
    { label: 'empty', regions: [] },
    { label: 'duplicate', regions: ['us', 'us'] },
    { label: 'unsupported', regions: ['us', 'sg'] }
  ])('rejects $label supported-region configuration with ServiceError', ({ regions }) => {
    expect(() => createZohoRegionSchema(regions as never)).toThrow(ServiceError);
  });
});
