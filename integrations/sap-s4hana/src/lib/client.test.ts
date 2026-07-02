import { describe, expect, it } from 'vitest';
import { odataDateTimeLiteral, SapS4HanaClient } from './client';

let resolvePageToken = (client: SapS4HanaClient, pageToken: string) =>
  (
    client as unknown as {
      resolvePageToken(pageToken: string): string | undefined;
    }
  ).resolvePageToken(pageToken);

let createClient = (baseUrl: string) =>
  new SapS4HanaClient({
    auth: {
      authMethod: 'apiHubKey',
      apiKey: 'test-api-key'
    },
    config: {
      baseUrl
    }
  });

describe('SAP S/4HANA OData client helpers', () => {
  it('formats datetime literals without milliseconds or timezone suffix', () => {
    expect(odataDateTimeLiteral('2026-01-02T03:04:05.678Z', 'datetime')).toBe(
      "datetime'2026-01-02T03:04:05'"
    );
  });

  it('keeps datetimeoffset literals as ISO timestamps', () => {
    expect(odataDateTimeLiteral('2026-01-02T03:04:05.678Z')).toBe(
      "datetimeoffset'2026-01-02T03:04:05.678Z'"
    );
  });

  it('replays SAP API Hub next links relative to a base URL path', () => {
    let client = createClient('https://sandbox.api.sap.com/s4hanacloud');

    expect(
      resolvePageToken(
        client,
        'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$skiptoken=abc'
      )
    ).toBe('/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$skiptoken=abc');
  });

  it('normalizes relative next links that already include the base URL path', () => {
    let client = createClient('https://sandbox.api.sap.com/s4hanacloud');

    expect(
      resolvePageToken(
        client,
        '/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$skiptoken=abc'
      )
    ).toBe('/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$skiptoken=abc');
  });
});
