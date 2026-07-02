import type { AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { createAuthenticatedAxios, requestAxios, requestAxiosData } from './index';

describe('createAuthenticatedAxios', () => {
  it('sets auth and JSON headers while preserving caller headers', () => {
    let client = createAuthenticatedAxios({
      baseURL: 'https://example.test',
      authHeader: {
        value: 'Bearer token'
      },
      headers: {
        Accept: 'application/json'
      }
    });

    expect(client.defaults.baseURL).toBe('https://example.test');
    expect(client.defaults.headers.Authorization).toBe('Bearer token');
    expect(client.defaults.headers['Content-Type']).toBe('application/json');
    expect(client.defaults.headers.Accept).toBe('application/json');
  });

  it('allows custom auth header names and disabling content type defaults', () => {
    let client = createAuthenticatedAxios({
      authHeader: {
        name: 'X-API-Key',
        value: 'secret'
      },
      contentType: false
    });

    expect(client.defaults.headers['X-API-Key']).toBe('secret');
    expect(client.defaults.headers['Content-Type']).toBeUndefined();
  });
});

describe('requestAxios helpers', () => {
  it('returns full responses or response data', async () => {
    let response = {
      config: {} as AxiosResponse<{ ok: boolean }>['config'],
      data: { ok: true },
      headers: {},
      status: 200,
      statusText: 'OK'
    };

    await expect(
      requestAxios(
        'get thing',
        async () => response,
        error => error
      )
    ).resolves.toBe(response);
    await expect(
      requestAxiosData(
        'get thing',
        async () => response,
        error => error
      )
    ).resolves.toEqual({ ok: true });
  });

  it('maps failures with the operation name', async () => {
    let upstream = new Error('upstream failed');
    let mapped = new Error('mapped failure');
    let seenOperation: string | undefined;

    await expect(
      requestAxiosData(
        'create thing',
        async () => {
          throw upstream;
        },
        (_error, operation) => {
          seenOperation = operation;
          return mapped;
        }
      )
    ).rejects.toBe(mapped);

    expect(seenOperation).toBe('create thing');
  });
});
