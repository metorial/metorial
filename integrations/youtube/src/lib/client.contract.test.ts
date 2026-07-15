import { afterEach, describe, expect, it, vi } from 'vitest';

let capturedAxiosConfig: any;
let getMock = vi.fn();
let putMock = vi.fn();
let postMock = vi.fn();
let probeSourceUrlMock = vi.fn();
let readSourceUrlChunkMock = vi.fn();

let loadClient = async () => {
  vi.resetModules();
  capturedAxiosConfig = undefined;
  getMock.mockReset();
  putMock.mockReset();
  postMock.mockReset();
  probeSourceUrlMock.mockReset();
  readSourceUrlChunkMock.mockReset();

  vi.doMock('@slates/provider', async () => {
    let actual = await vi.importActual<typeof import('@slates/provider')>('@slates/provider');

    return {
      ...actual,
      createAxios: vi.fn((config?: any) => {
        capturedAxiosConfig = config;
        return {
          get: getMock,
          put: putMock,
          post: postMock,
          delete: vi.fn()
        };
      })
    };
  });
  vi.doMock('./source-url', () => ({
    probeSourceUrl: probeSourceUrlMock,
    readSourceUrlChunk: readSourceUrlChunkMock
  }));

  let { Client } = await import('./client');
  return Client;
};

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('@slates/provider');
  vi.doUnmock('./source-url');
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

  it('uploads base64 video bytes through a resumable upload session', async () => {
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=test'
      },
      status: 200
    });
    putMock.mockResolvedValueOnce({
      data: {
        id: 'video-1',
        snippet: { title: 'Demo' },
        status: { privacyStatus: 'private', uploadStatus: 'uploaded' }
      },
      status: 201
    });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let result = await client.uploadVideo({
      title: 'Demo',
      content: Buffer.from('video-bytes'),
      mimeType: 'video/mp4'
    });

    expect(postMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/upload/youtube/v3/videos',
      {
        snippet: { title: 'Demo' },
        status: { privacyStatus: 'private' }
      },
      expect.objectContaining({
        params: {
          uploadType: 'resumable',
          part: 'snippet,status',
          notifySubscribers: false
        },
        headers: expect.objectContaining({
          'X-Upload-Content-Length': String(Buffer.byteLength('video-bytes')),
          'X-Upload-Content-Type': 'video/mp4'
        })
      })
    );
    expect(putMock).toHaveBeenCalledWith(
      expect.stringContaining('upload_id=test'),
      Buffer.from('video-bytes'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': `bytes 0-${Buffer.byteLength('video-bytes') - 1}/${Buffer.byteLength('video-bytes')}`,
          'Content-Type': 'video/mp4'
        })
      })
    );
    expect(result).toMatchObject({
      video: { id: 'video-1' },
      mimeType: 'video/mp4',
      sizeBytes: Buffer.byteLength('video-bytes'),
      sourceType: 'base64'
    });
  });

  it('streams a source URL through validated ranged chunks', async () => {
    let Client = await loadClient();
    let source = {
      contentLength: 5,
      entityTag: '"video"',
      finalUrl: 'https://cdn.example.com/final.mp4',
      mimeType: 'video/mp4'
    };
    probeSourceUrlMock.mockResolvedValueOnce(source);
    readSourceUrlChunkMock.mockResolvedValueOnce(Buffer.from('video'));
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=url'
      },
      status: 200
    });
    putMock.mockResolvedValueOnce({ data: { id: 'video-from-url' }, status: 201 });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let result = await client.uploadVideo({
      title: 'URL demo',
      sourceUrl: 'https://media.example.com/video.mp4'
    });

    expect(probeSourceUrlMock).toHaveBeenCalledWith('https://media.example.com/video.mp4');
    expect(readSourceUrlChunkMock).toHaveBeenCalledWith(source, 0, 4);
    expect(result).toMatchObject({
      mimeType: 'video/mp4',
      sizeBytes: 5,
      sourceType: 'url',
      video: { id: 'video-from-url' }
    });
  });

  it('rejects a source URL above the 2 GiB operational cap before starting an upload session', async () => {
    let Client = await loadClient();
    probeSourceUrlMock.mockResolvedValueOnce({
      contentLength: 2 * 1024 * 1024 * 1024 + 1,
      finalUrl: 'https://cdn.example.com/too-large.mp4',
      mimeType: 'video/mp4'
    });
    let client = new Client({ token: 'oauth-token', authType: 'oauth' });

    await expect(
      client.uploadVideo({
        title: 'Too large',
        sourceUrl: 'https://media.example.com/too-large.mp4'
      })
    ).rejects.toThrow('2 GiB) operational limit for server-side URL uploads');
    expect(postMock).not.toHaveBeenCalled();
    expect(readSourceUrlChunkMock).not.toHaveBeenCalled();
  });

  it('rejects malformed media types before using them as upload headers', async () => {
    let Client = await loadClient();
    let client = new Client({ token: 'oauth-token', authType: 'oauth' });

    await expect(
      client.uploadVideo({
        title: 'Invalid MIME',
        content: Buffer.from('video'),
        mimeType: 'video/mp4\r\nX-Injected: yes'
      })
    ).rejects.toThrow('Video mimeType must be video/* or application/octet-stream.');
    expect(postMock).not.toHaveBeenCalled();
  });

  it('continues resumable uploads from the committed range across multiple chunks', async () => {
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=chunked'
      },
      status: 200
    });
    putMock
      .mockResolvedValueOnce({
        data: {},
        headers: { range: 'bytes=0-8388607' },
        status: 308
      })
      .mockResolvedValueOnce({
        data: { id: 'video-2' },
        status: 201
      });
    let content = Buffer.alloc(8 * 1024 * 1024 + 1, 1);

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let result = await client.uploadVideo({
      title: 'Chunked demo',
      content,
      mimeType: 'video/mp4'
    });

    expect(putMock).toHaveBeenCalledTimes(2);
    expect(putMock.mock.calls[0]?.[2]?.headers['Content-Range']).toBe(
      `bytes 0-8388607/${content.length}`
    );
    expect(putMock.mock.calls[1]?.[2]?.headers['Content-Range']).toBe(
      `bytes 8388608-8388608/${content.length}`
    );
    expect(result.video.id).toBe('video-2');
  });

  it('restarts from byte 0 when a mid-session 308 omits the Range header', async () => {
    vi.useFakeTimers();
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=restart'
      },
      status: 200
    });
    putMock
      .mockResolvedValueOnce({ data: {}, headers: { range: 'bytes=0-4' }, status: 308 })
      .mockResolvedValueOnce({ data: {}, headers: {}, status: 308 })
      .mockResolvedValueOnce({ data: { id: 'video-restarted' }, status: 201 });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let upload = client.uploadVideo({
      title: 'Restart demo',
      content: Buffer.from('0123456789'),
      mimeType: 'video/mp4'
    });
    await vi.runAllTimersAsync();
    let result = await upload;

    expect(putMock).toHaveBeenCalledTimes(3);
    expect(putMock.mock.calls[0]?.[2]?.headers['Content-Range']).toBe('bytes 0-9/10');
    expect(putMock.mock.calls[1]?.[1]).toEqual(Buffer.from('56789'));
    expect(putMock.mock.calls[1]?.[2]?.headers['Content-Range']).toBe('bytes 5-9/10');
    expect(putMock.mock.calls[2]?.[1]).toEqual(Buffer.from('0123456789'));
    expect(putMock.mock.calls[2]?.[2]?.headers['Content-Range']).toBe('bytes 0-9/10');
    expect(result.video.id).toBe('video-restarted');
  });

  it('bounds repeated Range-less 308 restarts instead of looping forever', async () => {
    vi.useFakeTimers();
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=loop'
      },
      status: 200
    });
    putMock.mockResolvedValue({ data: {}, headers: {}, status: 308 });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let upload = client.uploadVideo({
      title: 'Loop demo',
      content: Buffer.from('video'),
      mimeType: 'video/mp4'
    });
    let assertion = expect(upload).rejects.toThrow(
      'YouTube resumable upload made no progress after repeated attempts.'
    );
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('retries a valid zero-progress 308 response instead of failing the session', async () => {
    vi.useFakeTimers();
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=stalled'
      },
      status: 200
    });
    putMock
      .mockResolvedValueOnce({ data: {}, headers: {}, status: 308 })
      .mockResolvedValueOnce({ data: { id: 'video-stalled' }, status: 201 });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let upload = client.uploadVideo({
      title: 'Retry demo',
      content: Buffer.from('video'),
      mimeType: 'video/mp4'
    });
    await vi.runAllTimersAsync();
    let result = await upload;

    expect(putMock).toHaveBeenCalledTimes(2);
    expect(result.video.id).toBe('video-stalled');
  });

  it('retries status probes before resuming from the confirmed committed offset', async () => {
    vi.useFakeTimers();
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: {},
      headers: {
        location:
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=recover'
      },
      status: 200
    });
    putMock
      .mockRejectedValueOnce({ response: { status: 503, headers: {} } })
      .mockRejectedValueOnce({ code: 'ECONNRESET' })
      .mockResolvedValueOnce({ data: {}, headers: { range: 'bytes=0-4' }, status: 308 })
      .mockResolvedValueOnce({ data: { id: 'video-recovered' }, status: 201 });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let upload = client.uploadVideo({
      title: 'Recovery demo',
      content: Buffer.from('0123456789'),
      mimeType: 'video/mp4'
    });
    await vi.runAllTimersAsync();
    let result = await upload;

    expect(putMock.mock.calls[1]?.[1]).toBeNull();
    expect(putMock.mock.calls[1]?.[2]?.headers['Content-Range']).toBe('bytes */10');
    expect(putMock.mock.calls[2]?.[1]).toBeNull();
    expect(putMock.mock.calls[3]?.[1]).toEqual(Buffer.from('56789'));
    expect(putMock.mock.calls[3]?.[2]?.headers['Content-Range']).toBe('bytes 5-9/10');
    expect(result.video.id).toBe('video-recovered');
  });

  it('uses the media upload endpoint for custom thumbnails', async () => {
    let Client = await loadClient();
    postMock.mockResolvedValueOnce({
      data: { items: [{ default: { url: 'https://img.test/1', width: 120, height: 90 } }] }
    });
    let content = Buffer.from('png');

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let result = await client.setThumbnail({
      videoId: 'video-1',
      content,
      mimeType: 'image/png'
    });

    expect(postMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/upload/youtube/v3/thumbnails/set',
      content,
      expect.objectContaining({
        params: { videoId: 'video-1', uploadType: 'media' },
        headers: expect.objectContaining({ 'Content-Type': 'image/png' })
      })
    );
    expect(result.items?.[0]?.default?.url).toBe('https://img.test/1');
  });

  it('downloads caption bytes from the owner-only caption endpoint', async () => {
    let Client = await loadClient();
    getMock.mockResolvedValueOnce({
      data: Buffer.from('WEBVTT'),
      headers: { 'content-type': 'application/octet-stream' }
    });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    let result = await client.downloadCaption({
      captionId: 'caption/1',
      format: 'vtt',
      language: 'pl'
    });

    expect(getMock).toHaveBeenCalledWith('/captions/caption%2F1', {
      params: { tfmt: 'vtt', tlang: 'pl' },
      responseType: 'arraybuffer'
    });
    expect(result.content.toString()).toBe('WEBVTT');
  });

  it('retrieves authenticated-user ratings from videos.getRating', async () => {
    let Client = await loadClient();
    getMock.mockResolvedValueOnce({
      data: { items: [{ videoId: 'v1', rating: 'like' }] }
    });

    let client = new Client({ token: 'oauth-token', authType: 'oauth' });
    await client.getVideoRating(['v1', 'v2']);

    expect(getMock).toHaveBeenCalledWith('/videos/getRating', {
      params: { id: 'v1,v2' }
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
