import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let hubSpotClientMocks = vi.hoisted(() => ({
  searchObjects: vi.fn()
}));

vi.mock('../lib/client', () => ({
  HubSpotClient: class {
    searchObjects(...args: unknown[]) {
      return hubSpotClientMocks.searchObjects(...args);
    }
  }
}));

import { provider } from '../index';

let createHubSpotToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('HubSpot CRM search', () => {
  beforeEach(() => {
    hubSpotClientMocks.searchObjects.mockReset();
    hubSpotClientMocks.searchObjects.mockResolvedValue({ results: [], total: 0 });
  });

  it('normalizes contact lifecycle date aliases and ISO range values', async () => {
    let client = createHubSpotToolTestClient();

    await client.invokeTool('search_crm', {
      objectType: 'contacts',
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'became_a_customer_date',
              operator: 'GTE',
              value: '2026-08-01T00:00:00+04:00'
            },
            {
              propertyName: 'createdate',
              operator: 'LTE',
              value: '2026-08-31T23:59:59+04:00'
            }
          ]
        }
      ],
      properties: ['email', 'became_a_customer_date'],
      limit: 5
    });

    expect(hubSpotClientMocks.searchObjects).toHaveBeenCalledWith('contacts', {
      query: undefined,
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_v2_date_entered_customer',
              operator: 'GTE',
              value: '1785528000000',
              highValue: undefined
            },
            {
              propertyName: 'createdate',
              operator: 'LTE',
              value: '1788206399000',
              highValue: undefined
            }
          ]
        }
      ],
      sorts: undefined,
      properties: ['email', 'hs_v2_date_entered_customer'],
      limit: 5,
      after: undefined
    });
  });

  it('preserves ISO-looking values for non-range filters and other object types', async () => {
    let client = createHubSpotToolTestClient();

    await client.invokeTool('search_crm', {
      objectType: 'companies',
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'became_a_customer_date',
              operator: 'EQ',
              value: '2026-08-01T00:00:00+04:00'
            }
          ]
        }
      ]
    });

    expect(hubSpotClientMocks.searchObjects).toHaveBeenCalledWith(
      'companies',
      expect.objectContaining({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'became_a_customer_date',
                operator: 'EQ',
                value: '2026-08-01T00:00:00+04:00',
                highValue: undefined
              }
            ]
          }
        ]
      })
    );
  });
});
