import {
  createLocalSlateTestClient,
  mapSlateTriggerEvent,
  pollSlateTriggerEvents
} from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';

(globalThis as typeof globalThis & { expect?: typeof expect }).expect = expect;

let hubSpotClientMocks = vi.hoisted(() => ({
  getRecentlyModified: vi.fn(),
  tokens: [] as string[]
}));

vi.mock('../lib/client', () => ({
  HubSpotClient: class {
    constructor(token: string) {
      hubSpotClientMocks.tokens.push(token);
    }

    getRecentlyModified(...args: unknown[]) {
      return hubSpotClientMocks.getRecentlyModified(...args);
    }
  }
}));

let createHubSpotTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: {
          token: 'test-token'
        }
      }
    }
  });

let resetHubSpotTriggerMocks = () => {
  hubSpotClientMocks.getRecentlyModified.mockReset();
  hubSpotClientMocks.tokens.splice(0);
};

describe('hubspot crm_object_changes trigger', () => {
  beforeEach(() => {
    resetHubSpotTriggerMocks();
  });

  it('seeds lastPollTime when the first poll is empty', async () => {
    let client = createHubSpotTriggerTestClient();

    hubSpotClientMocks.getRecentlyModified.mockResolvedValue({
      results: []
    });

    let polled = await pollSlateTriggerEvents({
      client,
      triggerId: 'crm_object_changes'
    });

    expect(hubSpotClientMocks.tokens).toEqual(['test-token']);
    expect(hubSpotClientMocks.getRecentlyModified).toHaveBeenCalledTimes(4);
    expect(hubSpotClientMocks.getRecentlyModified).toHaveBeenNthCalledWith(
      1,
      'contacts',
      undefined,
      50
    );
    expect(hubSpotClientMocks.getRecentlyModified).toHaveBeenNthCalledWith(
      2,
      'companies',
      undefined,
      50
    );
    expect(hubSpotClientMocks.getRecentlyModified).toHaveBeenNthCalledWith(
      3,
      'deals',
      undefined,
      50
    );
    expect(hubSpotClientMocks.getRecentlyModified).toHaveBeenNthCalledWith(
      4,
      'tickets',
      undefined,
      50
    );

    expect(polled.inputs).toEqual([]);
    expect(polled.updatedState).toEqual({
      lastPollTime: expect.any(String)
    });
  });

  it('returns created and updated inputs, skips failing object types, and maps an event', async () => {
    let client = createHubSpotTriggerTestClient();
    let lastPollTime = '2026-04-01T10:00:00.000Z';

    hubSpotClientMocks.getRecentlyModified.mockImplementation(
      async (objectType: string, since?: string, limit: number = 50) => {
        expect(since).toBe(lastPollTime);
        expect(limit).toBe(50);

        switch (objectType) {
          case 'contacts':
            return {
              results: [
                {
                  id: 'contact-1',
                  properties: {
                    hs_lastmodifieddate: '2026-04-01T10:05:00.000Z',
                    createdate: '2026-04-01T10:05:00.000Z',
                    email: 'contact@example.com'
                  }
                }
              ]
            };
          case 'companies':
            throw new Error('forbidden');
          case 'deals':
            return {
              results: [
                {
                  id: 'deal-1',
                  properties: {
                    hs_lastmodifieddate: '2026-04-01T10:10:00.000Z',
                    createdate: '2026-03-30T09:00:00.000Z',
                    dealname: 'Renewal'
                  }
                }
              ]
            };
          default:
            return {
              results: []
            };
        }
      }
    );

    let polled = await pollSlateTriggerEvents({
      client,
      triggerId: 'crm_object_changes',
      state: {
        lastPollTime
      }
    });

    expect(hubSpotClientMocks.getRecentlyModified).toHaveBeenCalledWith(
      'companies',
      lastPollTime,
      50
    );
    expect(polled.inputs).toEqual([
      {
        objectType: 'contacts',
        objectId: 'contact-1',
        changeType: 'created',
        properties: {
          hs_lastmodifieddate: '2026-04-01T10:05:00.000Z',
          createdate: '2026-04-01T10:05:00.000Z',
          email: 'contact@example.com'
        },
        modifiedAt: '2026-04-01T10:05:00.000Z',
        createdAt: '2026-04-01T10:05:00.000Z'
      },
      {
        objectType: 'deals',
        objectId: 'deal-1',
        changeType: 'updated',
        properties: {
          hs_lastmodifieddate: '2026-04-01T10:10:00.000Z',
          createdate: '2026-03-30T09:00:00.000Z',
          dealname: 'Renewal'
        },
        modifiedAt: '2026-04-01T10:10:00.000Z',
        createdAt: '2026-03-30T09:00:00.000Z'
      }
    ]);
    expect(polled.updatedState).toEqual({
      lastPollTime: '2026-04-01T10:10:00.000Z'
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'crm_object_changes',
      input: polled.inputs[0]!,
      type: 'contacts.created',
      output: {
        objectType: 'contacts',
        objectId: 'contact-1',
        changeType: 'created',
        modifiedAt: '2026-04-01T10:05:00.000Z'
      }
    });

    expect(mapped.id).toBe('contacts-contact-1-2026-04-01T10:05:00.000Z');
  });
});
