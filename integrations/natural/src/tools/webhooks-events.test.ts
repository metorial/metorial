import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import { listEvents, listWebhooks } from './webhooks-events';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

const paginatedEnvelope = (record: Record<string, unknown>) => ({
  data: [record],
  meta: {
    pagination: {
      hasMore: false,
      nextCursor: null
    }
  }
});

describe('Natural webhook and event list tools', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('preserves full webhook resources from list webhooks', async () => {
    const webhook = {
      id: 'whk_0192abc1def2789034567890abcdef12',
      type: 'webhook',
      attributes: {
        url: 'https://example.com/webhooks/natural',
        description: 'Production webhook',
        status: 'ENABLED',
        enabledEvents: ['wallet.created', 'party.updated'],
        tags: {
          env: 'prod',
          team: 'payments'
        },
        createdAt: '2026-03-16T12:00:00Z',
        updatedAt: '2026-03-16T12:00:00Z'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(webhook));

    const result = await listWebhooks.handleInvocation(
      createCtx({
        status: 'ENABLED',
        cursor: 'cur_123',
        limit: 25
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list webhooks',
      'get',
      '/webhooks',
      {
        params: {
          status: 'ENABLED',
          cursor: 'cur_123',
          limit: 25
        }
      }
    );
    expect(result.output.webhooks).toEqual([webhook]);
  });

  it('preserves full event resources from list events', async () => {
    const event = {
      id: 'evt_0192abc1def2789034567890abcdef12',
      type: 'event',
      attributes: {
        eventType: 'wallet.created',
        resourceId: 'wal_7c9e6679e29b41d4a716446655440001',
        resourceType: 'wallet',
        payload: {
          object: {
            displayName: 'Operating',
            status: 'active'
          }
        },
        createdAt: '2026-03-16T12:00:00Z'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(event));

    const result = await listEvents.handleInvocation(
      createCtx({
        partyId: 'pty_7c9e6679e29b41d4a716446655440001',
        eventType: 'wallet.created',
        createdAfter: '2026-03-01T00:00:00Z',
        createdBefore: '2026-04-01T00:00:00Z',
        cursor: 'cur_456',
        limit: 10
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith('list events', 'get', '/events', {
      params: {
        partyId: 'pty_7c9e6679e29b41d4a716446655440001',
        eventType: 'wallet.created',
        createdAfter: '2026-03-01T00:00:00Z',
        createdBefore: '2026-04-01T00:00:00Z',
        cursor: 'cur_456',
        limit: 10
      }
    });
    expect(result.output.events).toEqual([event]);
  });
});
