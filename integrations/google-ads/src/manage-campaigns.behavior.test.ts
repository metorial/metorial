import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let googleAdsClientMocks = vi.hoisted(() => ({
  mutateCampaignBudgets: vi.fn(),
  mutateCampaigns: vi.fn()
}));

vi.mock('./lib/helpers', () => ({
  createClient: vi.fn(() => googleAdsClientMocks)
}));

import { provider } from './index';

let createToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'google_oauth',
        output: {
          token: 'access-token',
          developerToken: 'developer-token'
        }
      }
    }
  });

describe('manage_campaigns v24 compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleAdsClientMocks.mutateCampaigns.mockResolvedValue({
      results: [{ resourceName: 'customers/1234567890/campaigns/42' }]
    });
  });

  it('creates campaigns with the required EU declaration and v24 date-time fields', async () => {
    await createToolTestClient().invokeTool('manage_campaigns', {
      customerId: '123-456-7890',
      operation: 'create',
      name: 'Summer search',
      advertisingChannelType: 'SEARCH',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING'
    });

    expect(googleAdsClientMocks.mutateCampaigns).toHaveBeenCalledWith('1234567890', [
      {
        create: {
          name: 'Summer search',
          advertisingChannelType: 'SEARCH',
          containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
          status: 'PAUSED',
          startDateTime: '2026-08-01 00:00:00',
          endDateTime: '2026-08-31 23:59:59'
        }
      }
    ]);
  });

  it('updates campaign dates and the EU declaration using v24 field masks', async () => {
    await createToolTestClient().invokeTool('manage_campaigns', {
      customerId: '1234567890',
      operation: 'update',
      campaignId: '42',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      containsEuPoliticalAdvertising: 'CONTAINS_EU_POLITICAL_ADVERTISING'
    });

    expect(googleAdsClientMocks.mutateCampaigns).toHaveBeenCalledWith('1234567890', [
      {
        update: {
          resourceName: 'customers/1234567890/campaigns/42',
          startDateTime: '2026-09-01 00:00:00',
          endDateTime: '2026-09-30 23:59:59',
          containsEuPoliticalAdvertising: 'CONTAINS_EU_POLITICAL_ADVERTISING'
        },
        updateMask: 'startDateTime,endDateTime,containsEuPoliticalAdvertising'
      }
    ]);
  });

  it('rejects campaign creation without an EU political advertising declaration', async () => {
    await expectSlateError(
      () =>
        createToolTestClient().invokeTool('manage_campaigns', {
          customerId: '1234567890',
          operation: 'create',
          name: 'Incomplete campaign',
          advertisingChannelType: 'SEARCH'
        }),
      'containsEuPoliticalAdvertising is required for create operation.'
    );

    expect(googleAdsClientMocks.mutateCampaignBudgets).not.toHaveBeenCalled();
    expect(googleAdsClientMocks.mutateCampaigns).not.toHaveBeenCalled();
  });
});
