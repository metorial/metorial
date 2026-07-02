import { afterEach, describe, expect, it, vi } from 'vitest';

let capturedAxiosConfig: any;
let getMock = vi.fn();
let putMock = vi.fn();

let loadClient = async () => {
  vi.resetModules();
  capturedAxiosConfig = undefined;
  getMock.mockReset();
  putMock.mockReset();

  vi.doMock('@slates/provider', async () => {
    let actual = await vi.importActual<typeof import('@slates/provider')>('@slates/provider');

    return {
      ...actual,
      createAxios: vi.fn((config?: any) => {
        capturedAxiosConfig = config;
        return {
          get: getMock,
          put: putMock,
          post: vi.fn(),
          delete: vi.fn()
        };
      })
    };
  });

  let { Client } = await import('./client');
  return Client;
};

afterEach(() => {
  vi.doUnmock('@slates/provider');
  vi.resetModules();
});

describe('youtube client contract', () => {
  it('sends API keys as the YouTube Data API key query parameter', async () => {
    let Client = await loadClient();
    getMock.mockResolvedValueOnce({
      data: {
        items: [],
        pageInfo: { totalResults: 0, resultsPerPage: 0 }
      }
    });

    let client = new Client({ apiKey: 'api-key', authType: 'apiKey' });
    await client.listVideos({
      part: ['snippet'],
      chart: 'mostPopular',
      maxResults: 1
    });

    expect(capturedAxiosConfig.headers).toBeUndefined();
    expect(getMock).toHaveBeenCalledWith('/videos', {
      params: expect.objectContaining({
        chart: 'mostPopular',
        key: 'api-key'
      })
    });
  });

  it('uses bearer auth for OAuth credentials', async () => {
    let Client = await loadClient();
    getMock.mockResolvedValueOnce({
      data: {
        items: [],
        pageInfo: { totalResults: 0, resultsPerPage: 0 }
      }
    });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    await client.listVideos({
      part: ['snippet'],
      chart: 'mostPopular',
      maxResults: 1
    });

    expect(capturedAxiosConfig.headers).toEqual({
      Authorization: 'Bearer oauth-token'
    });
    expect(getMock).toHaveBeenCalledWith('/videos', {
      params: expect.not.objectContaining({
        key: expect.anything()
      })
    });
  });

  it('preserves playlist snippet fields during partial playlist updates', async () => {
    let Client = await loadClient();
    getMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'playlist-id',
            snippet: {
              title: 'Current title',
              description: 'Current description',
              defaultLanguage: 'en'
            },
            status: {
              privacyStatus: 'private'
            }
          }
        ],
        pageInfo: { totalResults: 1, resultsPerPage: 1 }
      }
    });
    putMock.mockResolvedValueOnce({
      data: {
        id: 'playlist-id',
        snippet: {
          title: 'Current title',
          description: 'Updated description'
        },
        status: {
          privacyStatus: 'private'
        }
      }
    });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    await client.updatePlaylist({
      part: ['snippet', 'status'],
      playlistId: 'playlist-id',
      description: 'Updated description'
    });

    expect(putMock).toHaveBeenCalledWith(
      '/playlists',
      expect.objectContaining({
        id: 'playlist-id',
        snippet: {
          title: 'Current title',
          description: 'Updated description',
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: 'private'
        }
      }),
      expect.any(Object)
    );
  });
});
