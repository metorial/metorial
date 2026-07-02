import { afterEach, describe, expect, it, vi } from 'vitest';

let identityGet = vi.fn();
let identityPost = vi.fn();

let loadAuthClient = async () => {
  vi.resetModules();
  identityGet.mockReset();
  identityPost.mockReset();

  vi.doMock('@slates/provider', async () => {
    let actual = await vi.importActual<typeof import('@slates/provider')>('@slates/provider');

    return {
      ...actual,
      createAxios: vi.fn((config?: { baseURL?: string }) => {
        if (config?.baseURL === 'https://identitytoolkit.googleapis.com/v1') {
          return {
            get: identityGet,
            post: identityPost
          };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { AuthClient } = await import('./lib/firebase-auth');
  return new AuthClient({
    token: 'access-token',
    projectId: 'firebase-project',
    apiKey: 'web-api-key'
  });
};

afterEach(() => {
  vi.doUnmock('@slates/provider');
  vi.resetModules();
});

describe('firebase AuthClient', () => {
  it('lists users with the documented GET batchGet endpoint', async () => {
    let client = await loadAuthClient();
    identityGet.mockResolvedValueOnce({
      data: {
        users: [{ localId: 'user-1', email: 'one@example.com' }],
        nextPageToken: 'next-page'
      }
    });

    let result = await client.listUsers({
      maxResults: 1,
      nextPageToken: 'page-token'
    });

    expect(identityPost).not.toHaveBeenCalled();
    expect(identityGet).toHaveBeenCalledWith('/projects/firebase-project/accounts:batchGet', {
      headers: { Authorization: 'Bearer access-token' },
      params: {
        maxResults: 1,
        nextPageToken: 'page-token'
      }
    });
    expect(result).toEqual({
      users: [{ userId: 'user-1', email: 'one@example.com' }],
      nextPageToken: 'next-page'
    });
  });

  it('uses the Identity Toolkit disableUser field when updating disabled state', async () => {
    let client = await loadAuthClient();
    identityPost.mockResolvedValueOnce({
      data: {
        localId: 'user-1',
        email: 'one@example.com',
        displayName: 'One',
        disabled: true
      }
    });

    await client.updateUser('user-1', {
      disabled: true
    });

    expect(identityPost).toHaveBeenCalledWith(
      '/projects/firebase-project/accounts:update',
      {
        localId: 'user-1',
        disableUser: true
      },
      {
        headers: { Authorization: 'Bearer access-token' }
      }
    );
  });
});
