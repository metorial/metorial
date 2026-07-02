import { describe, expect, it } from 'vitest';
import { resolveSalesforceOAuthBaseUrl, resolveSalesforceOAuthConfig } from './auth';

describe('Salesforce OAuth target resolution', () => {
  it('uses production by default', () => {
    expect(resolveSalesforceOAuthBaseUrl({})).toBe('https://login.salesforce.com');
  });

  it('uses sandbox from profile config', () => {
    expect(resolveSalesforceOAuthBaseUrl({ environment: 'sandbox' })).toBe(
      'https://test.salesforce.com'
    );
  });

  it('uses normalized custom domains from profile config', () => {
    expect(
      resolveSalesforceOAuthBaseUrl({
        environment: 'custom',
        customDomain: 'https://acme.my.salesforce.com/setup'
      })
    ).toBe('https://acme.my.salesforce.com');
  });

  it('preserves apiVersion while resolving OAuth config', () => {
    expect(
      resolveSalesforceOAuthConfig({
        apiVersion: 'v61.0',
        environment: 'sandbox'
      })
    ).toEqual({
      apiVersion: 'v61.0',
      environment: 'sandbox'
    });
  });
});
