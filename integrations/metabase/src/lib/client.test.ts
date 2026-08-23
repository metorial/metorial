import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  createAxios: vi.fn()
}));

vi.mock('slates', () => ({
  createAxios: (config: unknown) => {
    mocks.createAxios(config);
    return mocks.http;
  },
  buildApiServiceError: (error: unknown) => error,
  getBase64ByteLength: (value: string) => Buffer.from(value, 'base64').byteLength
}));

import { MetabaseClient } from './client';

describe('MetabaseClient request contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the correct header for API key and session connections, including legacy sessions', () => {
    new MetabaseClient({ token: 'mb_abc123456789', instanceUrl: 'https://mb.example/' });
    expect(mocks.createAxios).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-KEY': 'mb_abc123456789' })
      })
    );

    new MetabaseClient({
      token: 'session-id',
      instanceUrl: 'https://mb.example',
      authMethod: 'session'
    });
    expect(mocks.createAxios).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Metabase-Session': 'session-id' })
      })
    );

    new MetabaseClient({ token: 'legacy-session-id', instanceUrl: 'https://mb.example' });
    expect(mocks.createAxios).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Metabase-Session': 'legacy-session-id' })
      })
    );
  });

  it('sends the documented card list filter and model_id parameters', async () => {
    mocks.http.get.mockResolvedValueOnce({ data: [] });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });
    await client.listCards({ filter: 'fav', modelId: 42 });
    expect(mocks.http.get).toHaveBeenCalledWith('/card', {
      params: { f: 'bookmarked', model_id: 42 }
    });
  });

  it('adds a dashcard by round-tripping the dashboard dashcards array', async () => {
    mocks.http.get.mockResolvedValueOnce({
      data: {
        tabs: [{ id: 5, name: 'Overview' }],
        dashcards: [
          {
            id: 7,
            card_id: 10,
            dashboard_tab_id: 5,
            row: 0,
            col: 0,
            size_x: 6,
            size_y: 4
          }
        ]
      }
    });
    mocks.http.put.mockResolvedValueOnce({
      data: {
        dashcards: [
          { id: 7, card_id: 10 },
          { id: 8, card_id: 20, row: 1, col: 2, size_x: 9, size_y: 5 }
        ]
      }
    });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });
    let added = await client.addCardToDashboard(3, {
      cardId: 20,
      row: 1,
      col: 2,
      sizeX: 9,
      sizeY: 5
    });
    expect(mocks.http.put).toHaveBeenCalledWith('/dashboard/3', {
      dashcards: [
        {
          id: 7,
          card_id: 10,
          dashboard_tab_id: 5,
          row: 0,
          col: 0,
          size_x: 6,
          size_y: 4
        },
        {
          id: -1,
          card_id: 20,
          row: 1,
          col: 2,
          size_x: 9,
          size_y: 5,
          dashboard_tab_id: 5,
          parameter_mappings: []
        }
      ],
      tabs: [{ id: 5, name: 'Overview' }]
    });
    expect(added.id).toBe(8);
  });

  it('removes a dashcard by omitting it from the complete dashboard update', async () => {
    mocks.http.get.mockResolvedValueOnce({
      data: {
        tabs: [{ id: 5, name: 'Overview' }],
        dashcards: [{ id: 7 }, { id: 8 }]
      }
    });
    mocks.http.put.mockResolvedValueOnce({ data: { dashcards: [{ id: 8 }] } });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });
    await client.removeCardFromDashboard(3, 7);
    expect(mocks.http.put).toHaveBeenCalledWith('/dashboard/3', {
      dashcards: [{ id: 8 }],
      tabs: [{ id: 5, name: 'Overview' }]
    });
  });

  it('sends export parameters in the JSON request body', async () => {
    mocks.http.post.mockResolvedValueOnce({ data: Buffer.from('a,b\n1,2\n') });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });
    await client.exportCardQuery(4, 'csv', {
      parameters: [{ type: 'category', value: 'A' }],
      formatRows: false,
      pivotResults: true
    });
    expect(mocks.http.post).toHaveBeenCalledWith(
      '/card/4/query/csv',
      {
        parameters: [{ type: 'category', value: 'A' }],
        format_rows: false,
        pivot_results: true
      },
      { responseType: 'arraybuffer' }
    );
  });

  it('uses the current notification API for question alerts', async () => {
    mocks.http.post.mockResolvedValueOnce({ data: { id: 9 } });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });
    await client.createAlert({
      cardId: 4,
      sendCondition: 'has_result',
      handlers: [{ channel_type: 'channel/email', recipients: [] }],
      subscriptions: [{ cron_schedule: '0 0 8 * * ? *' }]
    });
    expect(mocks.http.post).toHaveBeenCalledWith('/notification', {
      payload_type: 'notification/card',
      payload: { card_id: 4, send_condition: 'has_result', send_once: false },
      handlers: [{ channel_type: 'channel/email', recipients: [] }],
      subscriptions: [
        {
          type: 'notification-subscription/cron',
          cron_schedule: '0 0 8 * * ? *'
        }
      ]
    });
  });

  it('adds the cron subscription discriminator when updating an alert schedule', async () => {
    mocks.http.get.mockResolvedValueOnce({
      data: {
        id: 9,
        payload_type: 'notification/card',
        payload: { card_id: 4, send_condition: 'has_result', send_once: false },
        handlers: [{ channel_type: 'channel/email', recipients: [] }],
        subscriptions: []
      }
    });
    mocks.http.put.mockResolvedValueOnce({ data: { id: 9 } });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });

    await client.updateAlert(9, {
      subscriptions: [{ cron_schedule: '0 0 9 * * ? *' }]
    });

    expect(mocks.http.put).toHaveBeenCalledWith('/notification/9', {
      id: 9,
      payload_type: 'notification/card',
      payload: { card_id: 4, send_condition: 'has_result', send_once: false },
      handlers: [{ channel_type: 'channel/email', recipients: [] }],
      subscriptions: [
        {
          type: 'notification-subscription/cron',
          cron_schedule: '0 0 9 * * ? *'
        }
      ]
    });
  });

  it('sends notification and search filters with their documented query names', async () => {
    mocks.http.get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });

    await client.listAlerts({ cardId: 4, includeInactive: true });
    expect(mocks.http.get).toHaveBeenNthCalledWith(1, '/notification', {
      params: { card_id: 4, include_inactive: true }
    });

    await client.search({ collectionId: 8 });
    expect(mocks.http.get).toHaveBeenNthCalledWith(2, '/search', {
      params: {
        q: undefined,
        models: undefined,
        archived: undefined,
        collection: 8,
        table_db_id: undefined,
        limit: undefined,
        offset: undefined
      }
    });
  });

  it('resolves the membership ID after adding a user to a permission group', async () => {
    mocks.http.post.mockResolvedValueOnce({ data: [{ id: 12, email: 'user@example.com' }] });
    mocks.http.get.mockResolvedValueOnce({
      data: {
        '12': [
          { membership_id: 41, group_id: 3 },
          { membership_id: 42, group_id: 7 }
        ]
      }
    });
    let client = new MetabaseClient({ token: 'mb_key', instanceUrl: 'https://mb.example' });

    await expect(client.addUserToGroup(12, 7)).resolves.toEqual({ membership_id: 42 });
    expect(mocks.http.post).toHaveBeenCalledWith('/permissions/membership', {
      user_id: 12,
      group_id: 7
    });
    expect(mocks.http.get).toHaveBeenCalledWith('/permissions/membership');
  });
});
