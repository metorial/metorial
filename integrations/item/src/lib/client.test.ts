import crypto from 'node:crypto';
import { SlateError } from 'slates';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { http, createAuthenticatedAxiosMock } = vi.hoisted(() => {
  let http = {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  };

  return {
    http,
    createAuthenticatedAxiosMock: vi.fn(() => http)
  };
});

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAuthenticatedAxios: createAuthenticatedAxiosMock
  };
});

import { Client, MAX_WEBHOOK_PAYLOAD_BYTES } from './client';

const runId = '123e4567-e89b-42d3-a456-426614174000';

const renderErrorGraph = (root: unknown): string => {
  let rendered: string[] = [];
  let seen = new Set<object>();

  let visit = (value: unknown) => {
    if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
      if (value !== undefined) rendered.push(String(value));
      return;
    }

    if (seen.has(value)) return;
    seen.add(value);

    if (value instanceof Error) {
      rendered.push(value.name, value.message, value.stack ?? '');
    }

    for (let key of Reflect.ownKeys(value)) {
      rendered.push(String(key));
      let descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && 'value' in descriptor) visit(descriptor.value);
    }

    for (let key of ['parent', '_parent', 'cause']) {
      if (key in value) visit((value as Record<string, unknown>)[key]);
    }
  };

  visit(root);
  return rendered.join('\n');
};

describe('Item client contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs a shared authenticated client without exposing the key outside headers', () => {
    new Client({ token: 'item-key' });

    expect(createAuthenticatedAxiosMock).toHaveBeenCalledWith({
      baseURL: 'https://app.useitem.io',
      authHeader: {
        name: 'x-api-key',
        value: 'item-key'
      }
    });
  });

  it('omits optional get-object flags from the query when callers omit them', async () => {
    http.get.mockResolvedValueOnce({ data: { data: { id: 42 } } });
    let client = new Client({ token: 'item-key' });

    await client.getObject('contacts', { objectId: 42 });

    expect(http.get).toHaveBeenCalledWith('/api/objects/contacts', {
      params: { id: 42 }
    });
  });

  it('keeps search independent and serializes every filter while encoding objectType', async () => {
    http.get.mockResolvedValueOnce({
      data: {
        data: [],
        pagination: { total: 0, limit: 25, offset: 0, has_more: false }
      }
    });
    let client = new Client({ token: 'item-key' });

    let result = await client.listObjects('custom/type', {
      search: 'independent',
      limit: 25,
      offset: 0,
      sortBy: 'name',
      sortOrder: 'asc',
      filters: { name: 'Ada', email: 'ada@example.com', active: false, score: 0 }
    });

    expect(http.get).toHaveBeenCalledWith('/api/objects/custom%2Ftype', {
      params: {
        search: 'independent',
        limit: 25,
        offset: 0,
        sort_by: 'name',
        sort_order: 'asc',
        'filter[name]': 'Ada',
        'filter[email]': 'ada@example.com',
        'filter[active]': 'false',
        'filter[score]': '0'
      }
    });
    expect(result).toEqual({
      data: [],
      pagination: { total: 0, limit: 25, offset: 0, has_more: false }
    });
  });

  it('encodes object type and view ID as separate path segments', async () => {
    http.get.mockResolvedValueOnce({ data: { data: [] } });
    let client = new Client({ token: 'item-key' });

    await client.executeView('contact/type', 'view/id', { limit: 1, offset: 0 });

    expect(http.get).toHaveBeenCalledWith('/api/objects/contact%2Ftype/views/view%2Fid', {
      params: { limit: 1, offset: 0 }
    });
  });

  it('maps upstream status and Item details to ServiceError without leaking the API key', async () => {
    let token = 'super-secret-key';
    let upstreamError = Object.assign(new Error(`request failed for ${token}`), {
      response: {
        status: 422,
        statusText: `Unprocessable Entity for ${token}`,
        data: { error: `Invalid request for ${token}`, code: 'invalid_input' }
      }
    });
    http.get.mockRejectedValueOnce(upstreamError);
    let client = new Client({ token });
    let caught: unknown;

    try {
      await client.getSchema();
    } catch (error) {
      caught = error;
    }

    expect(caught).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: 'item_api_error',
          upstreamStatus: 422
        })
      })
    );
    let rendered = renderErrorGraph(caught);
    expect(rendered).toContain('Invalid request');
    expect(rendered).toContain('HTTP 422');
    expect(rendered).not.toContain(token);
    expect((caught as { parent?: unknown }).parent).not.toBe(upstreamError);
  });

  it('preserves Item details and status after the shared Axios interceptor maps the failure', async () => {
    let token = 'interceptor-secret';
    let upstreamError = new SlateError({
      code: 'upstream.invalid_request',
      kind: 'upstream',
      message: `Item rejected field priority for ${token}`,
      upstream: { status: 400 },
      baggage: { response: { error: `Item rejected field priority for ${token}` } }
    });
    http.get.mockRejectedValueOnce(upstreamError);
    let client = new Client({ token });
    let caught: unknown;

    try {
      await client.getSchema();
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      data: expect.objectContaining({
        reason: 'item_api_error',
        upstreamStatus: 400
      })
    });
    let rendered = renderErrorGraph(caught);
    expect(rendered).toContain('Item rejected field priority');
    expect(rendered).not.toContain(token);
    expect((caught as { parent?: unknown }).parent).not.toBe(upstreamError);
  });

  it('rejects false or missing delete success instead of claiming deletion', async () => {
    http.delete.mockResolvedValueOnce({ data: { success: false } });
    let client = new Client({ token: 'item-key' });

    await expect(client.deleteObject('contacts', 7)).rejects.toMatchObject({
      data: expect.objectContaining({ reason: 'item_malformed_success_response' })
    });
  });

  it('derives an honest batch summary from validated per-row results', async () => {
    http.post.mockResolvedValueOnce({
      data: {
        results: [
          { id: 1, status: 'created' },
          { id: 2, status: 'updated' },
          { id: null, status: 'failed', error: 'Bad row' }
        ],
        summary: { total: 99, created: 99, updated: 0, failed: 0 }
      }
    });
    let client = new Client({ token: 'item-key' });

    let result = await client.batchUpsertObjects('contacts', [
      { name: 'One' },
      { name: 'Two' },
      { name: 'Three' }
    ]);

    expect(result.summary).toEqual({ total: 3, created: 1, updated: 1, failed: 1 });
  });

  it('preserves genuinely empty user, view, and executed-view arrays', async () => {
    http.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } });
    let client = new Client({ token: 'item-key' });

    await expect(client.listUsers()).resolves.toEqual([]);
    await expect(client.listViews('contacts')).resolves.toEqual([]);
    await expect(client.executeView('contacts', runId)).resolves.toEqual({
      data: [],
      view: undefined,
      pagination: undefined
    });
  });

  it.each([
    ['users', () => new Client({ token: 'key' }).listUsers()],
    ['views', () => new Client({ token: 'key' }).listViews('contacts')],
    ['executed view', () => new Client({ token: 'key' }).executeView('contacts', runId)]
  ])('rejects a malformed successful %s response', async (_label, request) => {
    http.get.mockResolvedValueOnce({ data: {} });

    await expect(request()).rejects.toMatchObject({
      data: expect.objectContaining({ reason: 'item_malformed_success_response' })
    });
  });

  it.each([
    ['a non-object entry', { data: ['contacts'] }],
    ['a missing object type ID', { data: [{ slug: 'contacts', display_name: 'People' }] }],
    ['a non-string slug', { data: [{ id: 1, slug: 7, display_name: 'People' }] }],
    [
      'a field missing its API name',
      {
        data: [
          {
            id: 1,
            slug: 'contacts',
            display_name: 'People',
            fields: [{ display_name: 'Industry', field_type: 'select' }]
          }
        ]
      }
    ],
    [
      'an undocumented relationship type',
      {
        data: [
          {
            id: 1,
            slug: 'contacts',
            display_name: 'People',
            fields: [
              {
                field_name: 'company',
                display_name: 'Company',
                field_type: 'relation',
                relationship_type: 'many_to_many_v2'
              }
            ]
          }
        ]
      }
    ],
    [
      'a select option missing its value',
      {
        data: [
          {
            id: 1,
            slug: 'contacts',
            display_name: 'People',
            fields: [
              {
                field_name: 'industry',
                display_name: 'Industry',
                field_type: 'select',
                select_options: [{ label: 'Technology' }]
              }
            ]
          }
        ]
      }
    ]
  ])('reports a schema response with %s as malformed rather than casting it', async (_label, payload) => {
    http.get.mockResolvedValueOnce({ data: payload });
    let client = new Client({ token: 'item-key' });

    await expect(client.getSchema()).rejects.toMatchObject({
      data: expect.objectContaining({ reason: 'item_malformed_success_response' })
    });
  });

  it('accepts a documented schema payload and preserves nullable field metadata', async () => {
    http.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            slug: 'contacts',
            display_name: 'People',
            plural_display_name: 'People',
            description: null,
            icon: null,
            fields: [
              {
                field_name: 'industry',
                display_name: 'Industry',
                field_type: 'select',
                select_options: [{ label: 'Technology', value: 'technology', color: null }],
                relationship_type: null,
                number_min: null
              }
            ]
          }
        ]
      }
    });
    let client = new Client({ token: 'item-key' });

    let result = await client.getSchema();

    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        slug: 'contacts',
        display_name: 'People',
        fields: [
          expect.objectContaining({
            field_name: 'industry',
            field_type: 'select',
            relationship_type: null,
            select_options: [{ label: 'Technology', value: 'technology', color: null }]
          })
        ]
      })
    ]);
  });

  it('signs and sends the exact serialized UTF-8 webhook bytes', async () => {
    http.post.mockResolvedValueOnce({
      data: { success: true, skillRunId: runId, message: 'Accepted' }
    });
    let client = new Client({ token: 'item-key' });
    let payload = { event: 'café', nested: { enabled: true } };
    let rawBody = JSON.stringify(payload);
    let signature = crypto
      .createHmac('sha256', 'item-key')
      .update(rawBody, 'utf8')
      .digest('hex');

    await client.triggerSkillWebhook('skill/id', payload, { signPayload: true });

    expect(http.post).toHaveBeenCalledWith('/api/webhooks/skill%2Fid', rawBody, {
      headers: { 'x-webhook-signature': `sha256=${signature}` }
    });
  });

  it('accepts exactly 1,000,000 UTF-8 bytes and rejects one byte more before sending', async () => {
    let emptyPayloadBytes = Buffer.byteLength(JSON.stringify({ value: '' }), 'utf8');
    let exactPayload = { value: 'a'.repeat(MAX_WEBHOOK_PAYLOAD_BYTES - emptyPayloadBytes) };
    let oversizedPayload = {
      value: 'a'.repeat(MAX_WEBHOOK_PAYLOAD_BYTES - emptyPayloadBytes + 1)
    };
    http.post.mockResolvedValueOnce({ data: { success: true, skillRunId: runId } });
    let client = new Client({ token: 'item-key' });

    await expect(client.triggerSkillWebhook(runId, exactPayload)).resolves.toMatchObject({
      success: true,
      skillRunId: runId
    });
    await expect(client.triggerSkillWebhook(runId, oversizedPayload)).rejects.toMatchObject({
      data: expect.objectContaining({ reason: 'item_webhook_payload_too_large' })
    });
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed successful webhook responses and non-UUID run IDs', async () => {
    http.post
      .mockResolvedValueOnce({ data: { success: false, skillRunId: runId } })
      .mockResolvedValueOnce({ data: { success: true, skillRunId: 'not-a-uuid' } });
    let client = new Client({ token: 'item-key' });

    await expect(client.triggerSkillWebhook(runId, {})).rejects.toMatchObject({
      data: expect.objectContaining({ reason: 'item_malformed_success_response' })
    });
    await expect(client.triggerSkillWebhook(runId, {})).rejects.toMatchObject({
      data: expect.objectContaining({ reason: 'item_malformed_success_response' })
    });
  });
});
