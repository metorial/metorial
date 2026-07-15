import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';

let libraryGet = vi.fn();
let downloadGet = vi.fn();
let MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
let createAxiosMock = vi.fn((config?: { baseURL?: string }) =>
  config?.baseURL === 'https://photoslibrary.googleapis.com/v1'
    ? { get: libraryGet }
    : { get: downloadGet }
);

let loadClient = async () => {
  vi.resetModules();
  libraryGet.mockReset();
  downloadGet.mockReset();
  createAxiosMock.mockClear();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');
    return { ...actual, createAxios: createAxiosMock };
  });

  return await import('./client');
};

let validPhoto = {
  id: 'photo-1',
  baseUrl: 'https://lh3.googleusercontent.com/photo-token',
  mimeType: 'image/jpeg',
  filename: 'holiday.jpg',
  mediaMetadata: { photo: {} }
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('GooglePhotosLibraryClient downloadMediaItem', () => {
  it('retrieves metadata and downloads photo bytes without forwarding OAuth', async () => {
    let { GooglePhotosLibraryClient, MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES } = await loadClient();
    let content = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    libraryGet.mockResolvedValueOnce({ data: validPhoto });
    downloadGet.mockResolvedValueOnce({
      data: content,
      headers: { 'content-type': 'image/jpeg; charset=binary' }
    });

    let result = await new GooglePhotosLibraryClient('oauth-secret').downloadMediaItem(
      'photo-1'
    );

    expect(libraryGet).toHaveBeenCalledWith('/mediaItems/photo-1');
    expect(createAxiosMock).toHaveBeenNthCalledWith(1, {
      baseURL: 'https://photoslibrary.googleapis.com/v1',
      headers: { Authorization: 'Bearer oauth-secret' }
    });
    expect(createAxiosMock).toHaveBeenNthCalledWith(2);
    expect(downloadGet).toHaveBeenCalledWith(
      'https://lh3.googleusercontent.com/photo-token=d',
      {
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxBodyLength: MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES,
        maxContentLength: MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES
      }
    );
    expect(downloadGet.mock.calls[0]?.[1]).not.toHaveProperty('headers');
    expect(result).toEqual({
      mediaItemId: 'photo-1',
      filename: 'holiday.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      content
    });
  });

  it('uses =dv for a READY video and accepts an ArrayBuffer response', async () => {
    let { GooglePhotosLibraryClient } = await loadClient();
    let bytes = Uint8Array.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d
    ]).buffer;
    libraryGet.mockResolvedValueOnce({
      data: {
        id: 'video-1',
        baseUrl: 'https://lh3.googleusercontent.com/video-token',
        mimeType: 'video/quicktime',
        filename: 'clip.mov',
        mediaMetadata: { video: { status: 'READY' } }
      }
    });
    downloadGet.mockResolvedValueOnce({
      data: bytes,
      headers: new Headers({ 'Content-Type': 'video/mp4' })
    });

    let result = await new GooglePhotosLibraryClient('oauth-secret').downloadMediaItem(
      'video-1'
    );

    expect(downloadGet).toHaveBeenCalledWith(
      'https://lh3.googleusercontent.com/video-token=dv',
      expect.objectContaining({ responseType: 'arraybuffer', maxRedirects: 0 })
    );
    expect(result.mimeType).toBe('video/mp4');
    expect(result.mediaType).toBe('video');
    expect(result.content).toEqual(Buffer.from(bytes));
  });

  it.each([
    {
      name: 'a mismatched item ID',
      mediaItem: { ...validPhoto, id: 'different-id' },
      reason: 'google_photos_media_item_invalid'
    },
    {
      name: 'a missing base URL',
      mediaItem: { ...validPhoto, baseUrl: undefined },
      reason: 'google_photos_media_base_url_invalid'
    },
    {
      name: 'a non-HTTPS base URL',
      mediaItem: { ...validPhoto, baseUrl: 'http://lh3.googleusercontent.com/photo' },
      reason: 'google_photos_media_base_url_invalid'
    },
    {
      name: 'an untrusted HTTPS host',
      mediaItem: { ...validPhoto, baseUrl: 'https://attacker.example/photo' },
      reason: 'google_photos_media_base_url_invalid'
    },
    {
      name: 'a Google media URL with a query string',
      mediaItem: {
        ...validPhoto,
        baseUrl: 'https://lh3.googleusercontent.com/photo?redirect=attacker.example'
      },
      reason: 'google_photos_media_base_url_invalid'
    },
    {
      name: 'a Google media URL with a non-default port',
      mediaItem: { ...validPhoto, baseUrl: 'https://lh3.googleusercontent.com:8443/photo' },
      reason: 'google_photos_media_base_url_invalid'
    },
    {
      name: 'a non-media MIME type',
      mediaItem: { ...validPhoto, mimeType: 'text/html' },
      reason: 'google_photos_media_item_mime_type_invalid'
    },
    {
      name: 'a video that is still processing',
      mediaItem: {
        ...validPhoto,
        mimeType: 'video/mp4',
        mediaMetadata: { video: { status: 'PROCESSING' } }
      },
      reason: 'google_photos_video_not_ready'
    },
    {
      name: 'a video without video metadata',
      mediaItem: {
        ...validPhoto,
        mimeType: 'video/mp4',
        mediaMetadata: {}
      },
      reason: 'google_photos_video_metadata_unavailable'
    },
    {
      name: 'a video without any media metadata',
      mediaItem: {
        ...validPhoto,
        mimeType: 'video/mp4',
        mediaMetadata: undefined
      },
      reason: 'google_photos_video_metadata_unavailable'
    }
  ])('rejects $name before downloading', async ({ mediaItem, reason }) => {
    let { GooglePhotosLibraryClient } = await loadClient();
    libraryGet.mockResolvedValueOnce({ data: mediaItem });

    let error = await new GooglePhotosLibraryClient('oauth-secret')
      .downloadMediaItem('photo-1')
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({ reason });
    expect(downloadGet).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'an empty binary response',
      data: Buffer.alloc(0),
      headers: { 'content-type': 'image/jpeg' },
      reason: 'google_photos_media_content_invalid'
    },
    {
      name: 'a non-binary response',
      data: '<html>not media</html>',
      headers: { 'content-type': 'image/jpeg' },
      reason: 'google_photos_media_content_invalid'
    },
    {
      name: 'a missing content type',
      data: Buffer.from([1]),
      headers: {},
      reason: 'google_photos_media_download_mime_type_invalid'
    },
    {
      name: 'content with the wrong MIME family',
      data: Buffer.from([1]),
      headers: { 'content-type': 'text/html' },
      reason: 'google_photos_media_download_mime_type_invalid'
    },
    {
      name: 'an incomplete image MIME type',
      data: Buffer.from([1]),
      headers: { 'content-type': 'image/' },
      reason: 'google_photos_media_download_mime_type_invalid'
    },
    {
      name: 'bytes without the declared JPEG signature',
      data: Buffer.from('not a jpeg'),
      headers: { 'content-type': 'image/jpeg' },
      reason: 'google_photos_media_content_invalid'
    },
    {
      name: 'content declared above the attachment size limit',
      data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      headers: {
        'content-type': 'image/jpeg',
        'content-length': String(MAX_DOWNLOAD_BYTES + 1)
      },
      reason: 'google_photos_media_content_too_large'
    }
  ])('rejects $name from the media URL', async ({ data, headers, reason }) => {
    let { GooglePhotosLibraryClient } = await loadClient();
    libraryGet.mockResolvedValueOnce({ data: validPhoto });
    downloadGet.mockResolvedValueOnce({ data, headers });

    let error = await new GooglePhotosLibraryClient('oauth-secret')
      .downloadMediaItem('photo-1')
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({ reason });
  });

  it('does not advise retrying when video metadata is missing entirely', async () => {
    let { GooglePhotosLibraryClient } = await loadClient();
    libraryGet.mockResolvedValueOnce({
      data: { ...validPhoto, mimeType: 'video/mp4', mediaMetadata: {} }
    });

    let error = await new GooglePhotosLibraryClient('oauth-secret')
      .downloadMediaItem('photo-1')
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.message).toContain('video metadata');
    expect(error.message).not.toMatch(/retry/i);
    expect(downloadGet).not.toHaveBeenCalled();
  });

  it('maps metadata and byte request failures to ServiceError', async () => {
    let { GooglePhotosLibraryClient } = await loadClient();
    libraryGet.mockRejectedValueOnce({
      response: {
        status: 404,
        statusText: 'Not Found',
        data: { error: { message: 'Media item not found' } }
      }
    });
    let client = new GooglePhotosLibraryClient('oauth-secret');

    let metadataError = await client.downloadMediaItem('photo-1').catch(error => error);
    expect(metadataError).toBeInstanceOf(ServiceError);
    expect(metadataError.data).toMatchObject({
      reason: 'google_photos_media_item_api_error',
      upstreamStatus: 404
    });

    libraryGet.mockResolvedValueOnce({ data: validPhoto });
    downloadGet.mockRejectedValueOnce({
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: 'Expired base URL'
      }
    });

    let downloadError = await client.downloadMediaItem('photo-1').catch(error => error);
    expect(downloadError).toBeInstanceOf(ServiceError);
    expect(downloadError.data).toMatchObject({
      reason: 'google_photos_media_download_error',
      upstreamStatus: 403
    });
  });
});
