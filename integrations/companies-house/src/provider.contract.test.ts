import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { companiesHouseToolKeys, tools } from './tools';

const implementedToolKeys: (typeof companiesHouseToolKeys)[number][] = [
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
];

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
      toolIds: [...implementedToolKeys],
      triggerIds: [],
      authMethodIds: ['api_key']
    });

    expect(contract.provider).toEqual({
      type: 'provider',
      id: 'companies-house',
      name: 'Companies House',
      description:
        'Search and inspect companies, officers, filings, charges, insolvency records, and people with significant control in the UK public register.',
      metadata: {}
    });
    expect(contract.actions.map(action => action.id)).toEqual(implementedToolKeys);
    expect(contract.tools.map(tool => tool.id)).toEqual(implementedToolKeys);
    expect(contract.triggers).toEqual([]);
    expect(contract.configSchema).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {},
      additionalProperties: false
    });
    expect((await client.getDefaultConfig()).config).toBeNull();
    let configUpdate = await client.updateConfig(null, { unexpected: true });
    expect(configUpdate.success).toBe(true);
    expect(configUpdate.config).toEqual({});

    let apiKey = await client.getAuthMethod('api_key');
    expect(apiKey.authenticationMethod).toEqual({
      id: 'api_key',
      name: 'API Key',
      type: 'auth.token',
      inputSchema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            minLength: 1,
            description:
              'Companies House API key. Create or manage keys at https://developer.company-information.service.gov.uk/manage-applications'
          }
        },
        required: ['apiKey'],
        additionalProperties: false
      },
      outputSchema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          token: { type: 'string' }
        },
        required: ['token'],
        additionalProperties: false
      },
      capabilities: {
        getDefaultInput: { enabled: false },
        handleTokenRefresh: { enabled: false },
        handleChangedInput: { enabled: false },
        getProfile: { enabled: false }
      },
      docs: []
    });
    expect(contract.authMethods).toEqual([apiKey.authenticationMethod]);

    let output = await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input: { apiKey: '  secret-key  ' }
    });
    expect(output.output).toEqual({ token: 'secret-key' });

    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'api_key',
        input: { apiKey: '   ' }
      })
    ).rejects.toThrow();
    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'api_key',
        input: {}
      })
    ).rejects.toThrow();
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
    expect(companiesHouseToolKeys).toHaveLength(17);
    expect(tools).toHaveLength(17);
    for (let tool of tools) {
      expect(tool.tags).toEqual({ readOnly: true, destructive: false });
    }
    for (let key of companiesHouseToolKeys) {
      expect(`companies-house-${key}`.length).toBeLessThan(60);
    }
  });
});
