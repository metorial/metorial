import { beforeEach, describe, expect, it, vi } from 'vitest';

let { axiosMocks, createAxiosMock, getCurrentContextMock } = vi.hoisted(() => {
  let axiosMocks = {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  };

  return {
    axiosMocks,
    createAxiosMock: vi.fn(() => axiosMocks),
    getCurrentContextMock: vi.fn()
  };
});

vi.mock('slates', () => ({
  buildApiServiceError: (error: unknown, options: unknown) => ({ error, options }),
  createApiServiceError: (message: string, options: Record<string, unknown> = {}) =>
    Object.assign(new Error(message), { data: options }),
  createAxios: createAxiosMock,
  getCurrentContext: getCurrentContextMock
}));

import { LookerClient } from './client';

describe('Looker client request and response behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentContextMock.mockReturnValue({ auth: {} });
  });

  it.each([
    [
      'trailing slashes',
      'https://example.looker.com/proxy///',
      'https://example.looker.com/proxy/api/4.0'
    ],
    [
      'an existing API suffix',
      'https://example.looker.com/proxy/api/4.0/',
      'https://example.looker.com/proxy/api/4.0'
    ],
    [
      'repeated API suffixes',
      'https://example.looker.com/proxy///api/4.0///api/4.0///',
      'https://example.looker.com/proxy/api/4.0'
    ]
  ])('normalizes %s when constructing the HTTP client', (_name, instanceUrl, baseURL) => {
    new LookerClient({ instanceUrl, token: 'constructor-token' });

    expect(createAxiosMock).toHaveBeenCalledTimes(1);
    expect(createAxiosMock).toHaveBeenCalledWith({
      baseURL,
      headers: {
        Authorization: 'token constructor-token',
        'Content-Type': 'application/json'
      }
    });
  });

  it('rejects tool client construction when the invocation auth is bound to another host', () => {
    let authenticatedInstanceUrl = 'https://bound-a.looker.example/proxy';
    let currentInstanceUrl = 'https://bound-b.looker.example/proxy';
    let token = 'bound-tool-token';
    getCurrentContextMock.mockReturnValue({
      auth: {
        authenticatedInstanceUrl
      }
    });
    let caught: unknown;

    try {
      new LookerClient({
        instanceUrl: currentInstanceUrl,
        token
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ reason: 'looker_reauthentication_required' })
      })
    );
    let rendered = `${caught instanceof Error ? caught.message : String(caught)}\n${JSON.stringify(caught)}`;
    expect(rendered).not.toContain(authenticatedInstanceUrl);
    expect(rendered).not.toContain(currentInstanceUrl);
    expect(rendered).not.toContain(token);
    expect(createAxiosMock).not.toHaveBeenCalled();
  });

  it('accepts normalized-equivalent invocation auth bindings', () => {
    getCurrentContextMock.mockReturnValue({
      auth: {
        authenticatedInstanceUrl: 'https://equivalent.looker.example/proxy/'
      }
    });

    new LookerClient({
      instanceUrl: 'https://equivalent.looker.example/proxy/api/4.0/',
      token: 'equivalent-tool-token'
    });

    expect(createAxiosMock).toHaveBeenCalledWith({
      baseURL: 'https://equivalent.looker.example/proxy/api/4.0',
      headers: {
        Authorization: 'token equivalent-tool-token',
        'Content-Type': 'application/json'
      }
    });
  });

  it('rejects an explicit null invocation auth binding before client construction', () => {
    getCurrentContextMock.mockReturnValue({
      auth: {
        authenticatedInstanceUrl: null
      }
    });

    expect(
      () =>
        new LookerClient({
          instanceUrl: 'https://null-binding.looker.example',
          token: 'null-binding-tool-token'
        })
    ).toThrow(
      expect.objectContaining({
        data: expect.objectContaining({ reason: 'looker_reauthentication_required' })
      })
    );
    expect(createAxiosMock).not.toHaveBeenCalled();
  });

  it('sends connection test names as a single comma-delimited query value', async () => {
    axiosMocks.put.mockResolvedValueOnce({ data: [] });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com/',
      token: 'test-token'
    });

    await client.testConnection('warehouse/primary', {
      tests: ['connect', 'sql']
    });

    expect(axiosMocks.put).toHaveBeenCalledWith(
      '/connections/warehouse%2Fprimary/test',
      undefined,
      { params: { tests: 'connect,sql' } }
    );
  });

  it('omits the connection test filter when no tests are requested', async () => {
    axiosMocks.put.mockResolvedValue({ data: [] });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com/',
      token: 'test-token'
    });

    await client.testConnection('warehouse/primary');
    await client.testConnection('warehouse/primary', { tests: [] });

    expect(axiosMocks.put).toHaveBeenNthCalledWith(
      1,
      '/connections/warehouse%2Fprimary/test',
      undefined,
      { params: { tests: undefined } }
    );
    expect(axiosMocks.put).toHaveBeenNthCalledWith(
      2,
      '/connections/warehouse%2Fprimary/test',
      undefined,
      { params: { tests: undefined } }
    );
  });

  it('sends role IDs as a single comma-delimited query value', async () => {
    axiosMocks.get.mockResolvedValueOnce({ data: [] });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com/',
      token: 'test-token'
    });

    await client.listRoles({ fields: 'id,name', ids: ['3', '7'] });

    expect(axiosMocks.get).toHaveBeenCalledWith('/roles', {
      params: { fields: 'id,name', ids: '3,7' }
    });
  });

  it('converts dashboard search failures at the client boundary', async () => {
    let upstreamError = new Error('upstream failed');
    axiosMocks.get.mockRejectedValueOnce(upstreamError);
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    await expect(client.searchDashboards({ title: 'Revenue' })).rejects.toEqual({
      error: upstreamError,
      options: {
        providerLabel: 'Looker',
        operation: 'search dashboards',
        reason: 'looker_search_dashboards_failed'
      }
    });
  });

  it('passes role IDs as the raw array required by the user roles endpoint', async () => {
    axiosMocks.put.mockResolvedValueOnce({ data: [] });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    await client.setUserRoles('user/7', ['role-1', 'role-2']);

    expect(axiosMocks.put).toHaveBeenCalledWith('/users/user%2F7/roles', ['role-1', 'role-2']);
  });

  it('preserves false, zero, and null scheduled-plan updates', async () => {
    axiosMocks.patch.mockResolvedValueOnce({ data: { id: 'plan-1' } });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });
    let body = {
      name: null,
      enabled: false,
      inline_table_width: 0
    };

    await client.updateScheduledPlan('plan/1', body);

    expect(axiosMocks.patch).toHaveBeenCalledWith('/scheduled_plans/plan%2F1', body);
  });

  it('accepts successful 204 deletion responses without reading a body', async () => {
    axiosMocks.delete.mockResolvedValue({ status: 204, data: undefined });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    await client.deleteDashboard('dashboard/1');
    await client.deleteFolder('folder/1');
    await client.removeGroupUser('group/1', 'user/1');

    expect(axiosMocks.delete).toHaveBeenNthCalledWith(1, '/dashboards/dashboard%2F1');
    expect(axiosMocks.delete).toHaveBeenNthCalledWith(2, '/folders/folder%2F1');
    expect(axiosMocks.delete).toHaveBeenNthCalledWith(3, '/groups/group%2F1/users/user%2F1');
  });

  it('returns only metadata and attachment data for binary inline query results', async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: Uint8Array.from([1, 2, 3]) });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    let result = await client.runInlineQuery(
      {
        model: 'commerce',
        view: 'orders',
        fields: ['orders.id'],
        total: false
      },
      'xlsx'
    );

    expect(axiosMocks.post).toHaveBeenCalledWith(
      '/queries/run/xlsx',
      {
        model: 'commerce',
        view: 'orders',
        fields: ['orders.id'],
        total: false
      },
      { responseType: 'arraybuffer' }
    );
    expect(result.results).toEqual({
      resultFormat: 'xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      byteLength: 3,
      attachmentCount: 1
    });
    expect(result.attachment).toEqual({
      contentBase64: 'AQID',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  });

  it('returns CSV inline query results only through attachment data', async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: 'order_id,total\n1,42\n' });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    let result = await client.runInlineQuery(
      {
        model: 'commerce',
        view: 'orders',
        fields: ['orders.id', 'orders.total']
      },
      'csv'
    );

    expect(axiosMocks.post).toHaveBeenCalledWith(
      '/queries/run/csv',
      {
        model: 'commerce',
        view: 'orders',
        fields: ['orders.id', 'orders.total']
      },
      { responseType: 'text' }
    );
    expect(result.results).toEqual({
      resultFormat: 'csv',
      mimeType: 'text/csv',
      byteLength: 20,
      attachmentCount: 1
    });
    expect(result.attachment).toEqual({
      contentBase64: Buffer.from('order_id,total\n1,42\n').toString('base64'),
      mimeType: 'text/csv'
    });
  });

  it('returns SQL Runner text results only through attachment data', async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: '42\n' });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    let result = await client.runSqlQuery('query/1', 'txt');

    expect(axiosMocks.post).toHaveBeenCalledWith('/sql_queries/query%2F1/run/txt', null, {
      responseType: 'text'
    });
    expect(result.results).toEqual({
      resultFormat: 'txt',
      mimeType: 'text/plain',
      byteLength: 3,
      attachmentCount: 1
    });
    expect(result.attachment).toEqual({
      contentBase64: 'NDIK',
      mimeType: 'text/plain'
    });
  });

  it('uses the dedicated endpoints for user email credentials', async () => {
    axiosMocks.post.mockResolvedValueOnce({ data: {} });
    axiosMocks.patch.mockResolvedValueOnce({ data: {} });
    let client = new LookerClient({
      instanceUrl: 'https://example.looker.com',
      token: 'test-token'
    });

    await client.createUserEmailCredentials('user/7', {
      email: 'analyst@example.com',
      forced_password_reset_at_next_login: true
    });
    await client.updateUserEmailCredentials('user/7', {
      forced_password_reset_at_next_login: false
    });

    expect(axiosMocks.post).toHaveBeenCalledWith('/users/user%2F7/credentials_email', {
      email: 'analyst@example.com',
      forced_password_reset_at_next_login: true
    });
    expect(axiosMocks.patch).toHaveBeenCalledWith('/users/user%2F7/credentials_email', {
      forced_password_reset_at_next_login: false
    });
  });
});
