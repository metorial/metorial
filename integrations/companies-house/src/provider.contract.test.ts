import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { companiesHouseToolKeys } from './tools';

const implementedToolKeys: (typeof companiesHouseToolKeys)[number][] = [];

describe('companies-house provider contract', () => {
  it('exposes the provider, API-key auth, empty config, and implemented action subset', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'companies-house',
        name: 'Companies House',
        description:
          'Search and inspect companies, officers, filings, charges, insolvency records, and people with significant control in the UK public register.'
      },
      toolIds: implementedToolKeys,
      triggerIds: [],
      authMethodIds: ['api_key']
    });

    expect(contract.actions).toEqual([]);
    expect(contract.configSchema).toMatchObject({
      type: 'object',
      properties: {}
    });

    let apiKey = await client.getAuthMethod('api_key');
    expect(apiKey.authenticationMethod).toMatchObject({
      id: 'api_key',
      name: 'API Key',
      type: 'auth.token'
    });
    expect(apiKey.authenticationMethod.capabilities.getProfile?.enabled).not.toBe(true);

    let output = await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input: { apiKey: '  secret-key  ' }
    });
    expect(output.output).toEqual({ token: 'secret-key' });
  });

  it('defines the complete planned tool-key contract', () => {
    expect(companiesHouseToolKeys).toEqual([
      'search_companies',
      'search_companies_advanced',
      'get_company_profile',
      'search_officers',
      'list_company_officers',
      'list_officer_appointments',
      'search_disqualified_officers',
      'get_officer_disqualifications',
      'list_filing_history',
      'get_filing_history_item',
      'get_document_metadata',
      'download_filing_document',
      'list_company_charges',
      'get_company_charge',
      'get_company_insolvency',
      'list_company_pscs',
      'list_psc_statements'
    ]);
    expect(new Set(companiesHouseToolKeys).size).toBe(companiesHouseToolKeys.length);
    for (let key of companiesHouseToolKeys) {
      expect(`companies-house-${key}`.length).toBeLessThan(60);
    }
  });
});
