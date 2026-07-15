import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';

let apiGet = vi.fn();
let downloadGet = vi.fn();
let createAxiosMock = vi.fn((config?: { baseURL?: string }) =>
  config?.baseURL === 'https://slides.googleapis.com/v1'
    ? { get: apiGet }
    : { get: downloadGet }
);

let loadClient = async () => {
  vi.resetModules();
  apiGet.mockReset();
  downloadGet.mockReset();
  createAxiosMock.mockClear();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');
    return { ...actual, createAxios: createAxiosMock };
  });

  return await import('./client');
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('SlidesClient getPageThumbnail', () => {
  it('uses dotted thumbnail properties and downloads the requester-tagged URL without OAuth', async () => {
    let { SlidesClient } = await loadClient();
    let content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    apiGet.mockResolvedValueOnce({
      data: {
        width: 1600,
        height: 900,
        contentUrl: 'https://lh3.googleusercontent.com/thumbnail?token=signed'
      }
    });
    downloadGet.mockResolvedValueOnce({
      data: content,
      headers: { 'content-type': 'image/png; charset=binary' }
    });

    let client = new SlidesClient('oauth-token');
    let result = await client.getPageThumbnail('presentation/id', 'slide/id', 'LARGE');

    expect(apiGet).toHaveBeenCalledWith(
      '/presentations/presentation%2Fid/pages/slide%2Fid/thumbnail',
      {
        params: {
          'thumbnailProperties.mimeType': 'PNG',
          'thumbnailProperties.thumbnailSize': 'LARGE'
        }
      }
    );
    expect(createAxiosMock).toHaveBeenNthCalledWith(1, {
      baseURL: 'https://slides.googleapis.com/v1',
      headers: { Authorization: 'Bearer oauth-token' }
    });
    expect(createAxiosMock).toHaveBeenNthCalledWith(2);
    expect(downloadGet).toHaveBeenCalledWith(
      'https://lh3.googleusercontent.com/thumbnail?token=signed',
      { responseType: 'arraybuffer' }
    );
    expect(result).toEqual({
      width: 1600,
      height: 900,
      mimeType: 'image/png',
      content
    });
  });

  it('lets Google choose the size when thumbnailSize is omitted', async () => {
    let { SlidesClient } = await loadClient();
    apiGet.mockResolvedValueOnce({
      data: {
        width: 800,
        height: 450,
        contentUrl: 'https://lh3.googleusercontent.com/default-thumbnail'
      }
    });
    downloadGet.mockResolvedValueOnce({
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      headers: { 'content-type': 'image/png' }
    });

    let client = new SlidesClient('oauth-token');
    await client.getPageThumbnail('presentation-1', 'slide-1');

    expect(apiGet).toHaveBeenCalledWith(
      '/presentations/presentation-1/pages/slide-1/thumbnail',
      { params: { 'thumbnailProperties.mimeType': 'PNG' } }
    );
  });

  it('rejects non-HTTPS content URLs without making a download request', async () => {
    let { SlidesClient } = await loadClient();
    apiGet.mockResolvedValueOnce({
      data: {
        width: 800,
        height: 450,
        contentUrl: 'http://example.com/thumbnail.png'
      }
    });

    let client = new SlidesClient('oauth-token');
    await expect(
      client.getPageThumbnail('presentation-1', 'slide-1', 'MEDIUM')
    ).rejects.toBeInstanceOf(ServiceError);
    expect(downloadGet).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'an invalid content URL',
      response: { width: 800, height: 450, contentUrl: 'not a URL' },
      reason: 'google_slides_thumbnail_content_url_invalid'
    },
    {
      name: 'non-positive dimensions',
      response: {
        width: 0,
        height: 450,
        contentUrl: 'https://lh3.googleusercontent.com/thumbnail'
      },
      reason: 'google_slides_thumbnail_metadata_invalid'
    }
  ])('rejects thumbnail metadata with $name', async ({ response, reason }) => {
    let { SlidesClient } = await loadClient();
    apiGet.mockResolvedValueOnce({ data: response });

    let error = await new SlidesClient('oauth-token')
      .getPageThumbnail('presentation-1', 'slide-1')
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({ reason });
    expect(downloadGet).not.toHaveBeenCalled();
  });

  it('maps thumbnail generation and download failures to ServiceError', async () => {
    let { SlidesClient } = await loadClient();
    apiGet.mockRejectedValueOnce({
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: { error: { message: 'Permission denied' } }
      }
    });
    let client = new SlidesClient('oauth-token');

    let generationError = await client
      .getPageThumbnail('presentation-1', 'slide-1')
      .catch(error => error);
    expect(generationError).toBeInstanceOf(ServiceError);
    expect(generationError.data).toMatchObject({
      reason: 'google_slides_thumbnail_api_error',
      upstreamStatus: 403
    });

    apiGet.mockResolvedValueOnce({
      data: {
        width: 800,
        height: 450,
        contentUrl: 'https://lh3.googleusercontent.com/expired-thumbnail'
      }
    });
    downloadGet.mockRejectedValueOnce({
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: 'Expired'
      }
    });

    let downloadError = await client
      .getPageThumbnail('presentation-1', 'slide-1')
      .catch(error => error);
    expect(downloadError).toBeInstanceOf(ServiceError);
    expect(downloadError.data).toMatchObject({
      reason: 'google_slides_thumbnail_download_error',
      upstreamStatus: 403
    });
  });

  it.each([
    {
      name: 'a missing content type',
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      headers: {},
      reason: 'google_slides_thumbnail_mime_type_invalid'
    },
    {
      name: 'a non-PNG content type',
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      headers: { 'content-type': 'text/html' },
      reason: 'google_slides_thumbnail_mime_type_invalid'
    },
    {
      name: 'a non-binary body',
      data: '<html>not an image</html>',
      headers: { 'content-type': 'image/png' },
      reason: 'google_slides_thumbnail_content_invalid'
    },
    {
      name: 'bytes without a PNG signature',
      data: Buffer.from('not a png'),
      headers: { 'content-type': 'image/png' },
      reason: 'google_slides_thumbnail_content_invalid'
    }
  ])('rejects $name from the thumbnail URL', async ({ data, headers, reason }) => {
    let { SlidesClient } = await loadClient();
    apiGet.mockResolvedValueOnce({
      data: {
        width: 800,
        height: 450,
        contentUrl: 'https://lh3.googleusercontent.com/thumbnail'
      }
    });
    downloadGet.mockResolvedValueOnce({ data, headers });

    let error = await new SlidesClient('oauth-token')
      .getPageThumbnail('presentation-1', 'slide-1')
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({ reason });
  });
});
