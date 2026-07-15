import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  http: {
    request: vi.fn()
  },
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: axiosMocks.createAxios
  };
});

import {
  GOOGLE_CHAT_API_BASE_URL,
  GoogleChatClient,
  resolveGoogleChatRequestUrl
} from './client';

beforeEach(() => {
  axiosMocks.http.request.mockReset();
  axiosMocks.createAxios.mockReset();
  axiosMocks.createAxios.mockReturnValue(axiosMocks.http);
});

describe('GoogleChatClient', () => {
  it('creates a Chat v1 client and returns generic request data', async () => {
    axiosMocks.http.request.mockResolvedValue({
      data: { spaces: [{ name: 'spaces/AAAA' }] }
    });

    let client = new GoogleChatClient('access-token');
    await expect(
      client.request<{ spaces: { name: string }[] }>('spaces', {
        method: 'get',
        params: { pageSize: 10 },
        operation: 'list spaces'
      })
    ).resolves.toEqual({ spaces: [{ name: 'spaces/AAAA' }] });

    expect(axiosMocks.createAxios).toHaveBeenCalledWith({
      baseURL: GOOGLE_CHAT_API_BASE_URL,
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json'
      }
    });
    expect(axiosMocks.http.request).toHaveBeenCalledWith({
      url: 'spaces',
      method: 'get',
      params: { pageSize: 10 }
    });
  });

  it('maps upstream failures through the Google Chat API adapter', async () => {
    axiosMocks.http.request.mockRejectedValue({
      response: {
        status: 403,
        data: { error: { message: 'The caller lacks permission.' } }
      }
    });

    let client = new GoogleChatClient('access-token');
    await expect(
      client.request('spaces/AAAA', { operation: 'get space' })
    ).rejects.toMatchObject({
      data: {
        reason: 'google_chat_api_error',
        upstreamStatus: 403
      }
    });
  });

  it('allows same-origin absolute URLs but rejects unsafe bearer-token targets', () => {
    expect(resolveGoogleChatRequestUrl('spaces/AAAA')).toBe('spaces/AAAA');
    expect(resolveGoogleChatRequestUrl('https://chat.googleapis.com/upload/v1/media')).toBe(
      'https://chat.googleapis.com/upload/v1/media'
    );
    expect(() => resolveGoogleChatRequestUrl('https://example.com/v1/spaces')).toThrow(
      ServiceError
    );
    expect(() => resolveGoogleChatRequestUrl('//example.com/v1/spaces')).toThrow(ServiceError);
    expect(() => resolveGoogleChatRequestUrl('\\\\example.com/v1/spaces')).toThrow(
      ServiceError
    );
    expect(() => resolveGoogleChatRequestUrl('/\\example.com/v1/spaces')).toThrow(
      ServiceError
    );
    expect(() => resolveGoogleChatRequestUrl('http://chat.googleapis.com/v1/spaces')).toThrow(
      ServiceError
    );
    expect(() =>
      resolveGoogleChatRequestUrl('https://user:secret@chat.googleapis.com/v1/spaces')
    ).toThrow(ServiceError);
  });

  it('rejects an empty access token before creating an authenticated client', () => {
    expect(() => new GoogleChatClient('   ')).toThrow(ServiceError);
    expect(axiosMocks.createAxios).not.toHaveBeenCalled();
  });
});
