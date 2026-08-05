import { beforeEach, describe, expect, it, vi } from 'vitest';

let http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: vi.fn(() => http)
  };
});

import { createApiServiceError, createAxios } from 'slates';
import {
  authenticateOdooJson2,
  authenticateOdooJsonRpc,
  detectOdooVersion,
  normalizeOdooInstanceUrl,
  OdooClient
} from './client';
import { createClient } from './helpers';

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
  vi.mocked(createAxios).mockClear();
});

describe('normalizeOdooInstanceUrl', () => {
  it('trims whitespace and trailing slashes while preserving a deployment path', () => {
    expect(normalizeOdooInstanceUrl('  https://Odoo.Example.com/erp///  ')).toBe(
      'https://odoo.example.com/erp'
    );
  });

  it('allows HTTP for self-hosted development instances', () => {
    expect(normalizeOdooInstanceUrl('http://localhost:8069/')).toBe('http://localhost:8069');
  });

  it.each([
    '',
    'odoo.example.com',
    'ftp://odoo.example.com',
    'https://user:secret@odoo.example.com',
    'https://odoo.example.com?db=prod',
    'https://odoo.example.com/#settings'
  ])('rejects invalid instance URL %s', value => {
    expect(() => normalizeOdooInstanceUrl(value)).toThrow();
  });
});

describe('detectOdooVersion', () => {
  it('selects JSON-2 from the Odoo 19 web version response', async () => {
    http.get.mockResolvedValue({
      data: { version_info: [19, 0, 0, 'final', 0, ''], version: '19.0' }
    });

    await expect(detectOdooVersion('https://odoo.example.com/')).resolves.toEqual({
      major: 19,
      version: '19.0',
      transport: 'json2'
    });
    expect(http.get).toHaveBeenCalledWith('/web/version');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('selects JSON-2 from the Odoo Online SaaS version response', async () => {
    http.get.mockResolvedValue({
      data: {
        version_info: ['saas~19', 4, 0, 'final', 0, 'e'],
        version: 'saas~19.4+e'
      }
    });

    await expect(detectOdooVersion('https://odoo.example.com/')).resolves.toEqual({
      major: 19,
      version: 'saas~19.4+e',
      transport: 'json2'
    });
    expect(http.get).toHaveBeenCalledWith('/web/version');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('falls back to common.version for older servers', async () => {
    http.get.mockRejectedValue(new Error('not found'));
    http.post.mockResolvedValue({
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          server_version_info: [18, 0, 0, 'final', 0],
          server_version: '18.0'
        }
      }
    });

    await expect(detectOdooVersion('https://odoo.example.com')).resolves.toEqual({
      major: 18,
      version: '18.0',
      transport: 'jsonrpc'
    });
    expect(http.post).toHaveBeenCalledWith('/jsonrpc', {
      jsonrpc: '2.0',
      method: 'call',
      id: 1,
      params: { service: 'common', method: 'version', args: [] }
    });
  });
});

describe('Odoo authentication requests', () => {
  it('authenticates JSON-2 API keys with bearer and database headers', async () => {
    http.post.mockResolvedValue({ data: { uid: 17, lang: 'en_US' } });

    await expect(
      authenticateOdooJson2({
        instanceUrl: 'https://odoo.example.com/',
        database: ' production ',
        token: 'api-key'
      })
    ).resolves.toBe(17);
    expect(createAxios).toHaveBeenCalledWith({
      baseURL: 'https://odoo.example.com',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    expect(http.post).toHaveBeenCalledWith(
      '/json/2/res.users/context_get',
      {},
      {
        headers: {
          Authorization: 'bearer api-key',
          'X-Odoo-Database': 'production'
        }
      }
    );
  });

  it('authenticates legacy credentials through common.authenticate', async () => {
    http.post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1, result: 23 } });

    await expect(
      authenticateOdooJsonRpc({
        instanceUrl: 'https://odoo.example.com',
        database: 'production',
        username: 'bot@example.com',
        token: 'legacy-key'
      })
    ).resolves.toBe(23);
    expect(http.post).toHaveBeenCalledWith('/jsonrpc', {
      jsonrpc: '2.0',
      method: 'call',
      id: 1,
      params: {
        service: 'common',
        method: 'authenticate',
        args: ['production', 'bot@example.com', 'legacy-key', {}]
      }
    });
  });
});

describe('OdooClient JSON-2 requests', () => {
  it('sends bearer and database headers with named arguments and record ids', async () => {
    http.post.mockResolvedValue({ data: [{ id: 7, name: 'Example' }] });
    let client = new OdooClient({
      instanceUrl: 'https://odoo.example.com',
      database: 'production',
      uid: 7,
      username: 'bot@example.com',
      token: 'api-key',
      transport: 'json2'
    });

    await expect(
      client.callRecordMethod({
        model: 'res.partner',
        method: 'read',
        ids: [7],
        arguments: { fields: ['name'] }
      })
    ).resolves.toEqual([{ id: 7, name: 'Example' }]);
    expect(http.post).toHaveBeenCalledWith(
      '/json/2/res.partner/read',
      { fields: ['name'], ids: [7] },
      {
        headers: {
          Authorization: 'bearer api-key',
          'X-Odoo-Database': 'production'
        }
      }
    );
  });

  it('does not inherit mutable config when bound auth intentionally omitted a database', async () => {
    http.post.mockResolvedValue({ data: [] });
    let client = createClient({
      config: {
        instanceUrl: 'https://mutable.example.com',
        database: 'mutable-database'
      },
      auth: {
        token: 'api-key',
        username: 'unverified@example.com',
        uid: 7,
        instanceUrl: 'https://bound.example.com',
        transport: 'json2'
      }
    });

    await client.callModelMethod({ model: 'res.partner', method: 'search', arguments: {} });

    expect(createAxios).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://bound.example.com' })
    );
    expect(http.post).toHaveBeenCalledWith(
      '/json/2/res.partner/search',
      {},
      { headers: { Authorization: 'bearer api-key' } }
    );
  });
});

describe('OdooClient legacy JSON-RPC requests', () => {
  it('uses execute_kw envelopes and monotonically increasing request ids', async () => {
    http.post
      .mockResolvedValueOnce({ data: { jsonrpc: '2.0', id: 1, result: [7] } })
      .mockResolvedValueOnce({ data: { jsonrpc: '2.0', id: 2, result: [8] } });
    let client = new OdooClient({
      instanceUrl: 'https://odoo.example.com',
      database: 'production',
      uid: 3,
      username: 'bot@example.com',
      token: 'legacy-key'
    });

    await client.callModelMethod({
      model: 'res.partner',
      method: 'search',
      legacyArguments: [[]],
      legacyKeywordArguments: { limit: 1 }
    });
    await client.callModelMethod({
      model: 'res.partner',
      method: 'search',
      legacyArguments: [[['active', '=', true]]]
    });

    expect(http.post).toHaveBeenNthCalledWith(1, '/jsonrpc', {
      jsonrpc: '2.0',
      method: 'call',
      id: 1,
      params: {
        service: 'object',
        method: 'execute_kw',
        args: ['production', 3, 'legacy-key', 'res.partner', 'search', [[]], { limit: 1 }]
      }
    });
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      '/jsonrpc',
      expect.objectContaining({ id: 2 })
    );
  });

  it('uses config fallback for genuinely legacy unbound auth', async () => {
    http.post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1, result: [] } });
    let client = createClient({
      config: { instanceUrl: 'https://legacy.example.com', database: 'legacy-db' },
      auth: { token: 'legacy-key', username: 'bot@example.com', uid: 3 }
    });

    await client.callModelMethod({ model: 'res.partner', method: 'search' });

    expect(createAxios).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://legacy.example.com' })
    );
    expect(http.post).toHaveBeenCalledWith(
      '/jsonrpc',
      expect.objectContaining({
        params: expect.objectContaining({
          args: expect.arrayContaining(['legacy-db'])
        })
      })
    );
  });
});

describe('OdooClient response errors', () => {
  it('rejects malformed legacy envelopes', async () => {
    http.post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1 } });
    let client = new OdooClient({
      instanceUrl: 'https://odoo.example.com',
      database: 'production',
      uid: 3,
      username: 'bot@example.com',
      token: 'legacy-key'
    });

    await expect(
      client.callModelMethod({ model: 'res.partner', method: 'search' })
    ).rejects.toMatchObject({ data: { reason: 'odoo_response_invalid' } });
  });

  it('maps JSON-RPC error envelopes to provider ServiceErrors', async () => {
    http.post.mockResolvedValue({
      data: {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: 200,
          message: 'Server error',
          data: { code: 'odoo.exceptions.AccessError', message: 'Access denied' }
        }
      }
    });
    let client = new OdooClient({
      instanceUrl: 'https://odoo.example.com',
      database: 'production',
      uid: 3,
      username: 'bot@example.com',
      token: 'legacy-key'
    });

    await expect(
      client.callModelMethod({ model: 'res.partner', method: 'search' })
    ).rejects.toMatchObject({
      data: {
        reason: 'odoo_rpc_error',
        upstreamCode: 'odoo.exceptions.AccessError'
      }
    });
  });

  it('preserves existing ServiceErrors from failed HTTP calls', async () => {
    let existing = createApiServiceError('Already normalized', {
      reason: 'existing_service_error'
    });
    http.post.mockRejectedValue(existing);
    let client = new OdooClient({
      instanceUrl: 'https://odoo.example.com',
      uid: 7,
      username: 'bot@example.com',
      token: 'api-key',
      transport: 'json2'
    });

    let caught: unknown;
    try {
      await client.callModelMethod({ model: 'res.partner', method: 'search' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(existing);
  });
});

describe('OdooClient transport compatibility', () => {
  it('defaults legacy stored connections to JSON-RPC and requires their database', () => {
    expect(
      () =>
        new OdooClient({
          instanceUrl: 'https://odoo.example.com',
          uid: 7,
          username: 'bot@example.com',
          token: 'secret'
        })
    ).toThrow(/database name is required/i);
  });

  it('allows JSON-2 connections without a database header', () => {
    expect(
      () =>
        new OdooClient({
          instanceUrl: 'https://odoo.example.com',
          uid: 7,
          username: 'bot@example.com',
          token: 'secret',
          transport: 'json2'
        })
    ).not.toThrow();
  });
});
