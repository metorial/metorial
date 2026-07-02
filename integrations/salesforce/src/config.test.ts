import { describe, expect, it } from 'vitest';
import { config, normalizeSalesforceConfig, normalizeSalesforceCustomDomain } from './config';

describe('Salesforce config normalization', () => {
  it('defaults to production and preserves apiVersion', () => {
    expect(normalizeSalesforceConfig({ apiVersion: 'v61.0' })).toEqual({
      apiVersion: 'v61.0',
      environment: 'production'
    });
  });

  it('clears customDomain outside custom environments', () => {
    expect(
      normalizeSalesforceConfig({
        apiVersion: 'v62.0',
        environment: 'sandbox',
        customDomain: 'acme.my'
      })
    ).toEqual({
      apiVersion: 'v62.0',
      environment: 'sandbox'
    });
  });

  it('requires customDomain for custom environments', () => {
    expect(() =>
      normalizeSalesforceConfig({
        apiVersion: 'v62.0',
        environment: 'custom'
      })
    ).toThrow('Salesforce customDomain is required');
  });

  it('rejects custom config without customDomain at schema validation time', () => {
    expect(
      config.configSchema.safeParse({
        environment: 'custom',
        apiVersion: 'v62.0'
      }).success
    ).toBe(false);
  });

  it('normalizes customDomain input forms', () => {
    expect(normalizeSalesforceCustomDomain('acme')).toBe('acme.my.salesforce.com');
    expect(normalizeSalesforceCustomDomain('acme.my')).toBe('acme.my.salesforce.com');
    expect(normalizeSalesforceCustomDomain('Acme.My.Salesforce.Com')).toBe(
      'acme.my.salesforce.com'
    );
    expect(normalizeSalesforceCustomDomain('https://acme.my.salesforce.com/setup')).toBe(
      'acme.my.salesforce.com'
    );
  });
});
