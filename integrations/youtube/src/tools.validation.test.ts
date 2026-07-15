import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  downloadCaption: vi.fn(),
  getVideoRating: vi.fn(),
  setThumbnail: vi.fn(),
  uploadVideo: vi.fn()
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();
  return {
    ...actual,
    Client: class {
      static fromAuth() {
        return new this();
      }

      downloadCaption(...args: unknown[]) {
        return clientMocks.downloadCaption(...args);
      }

      getVideoRating(...args: unknown[]) {
        return clientMocks.getVideoRating(...args);
      }

      setThumbnail(...args: unknown[]) {
        return clientMocks.setThumbnail(...args);
      }

      uploadVideo(...args: unknown[]) {
        return clientMocks.uploadVideo(...args);
      }
    }
  };
});

import { provider } from './index';

let createToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth2',
        output: { token: 'test-token', authType: 'oauth' }
      }
    }
  });

describe('YouTube Phase 2 tool behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing or conflicting upload sources before calling the client', async () => {
    let client = createToolTestClient();

    await expectSlateError(
      () => client.invokeTool('upload_video', { title: 'No source' }),
      'Provide exactly one video source: contentBase64 or sourceUrl.'
    );
    await expectSlateError(
      () =>
        client.invokeTool('upload_video', {
          title: 'Two sources',
          contentBase64: Buffer.from('video').toString('base64'),
          sourceUrl: 'https://media.example.com/video.mp4'
        }),
      'Provide exactly one video source: contentBase64 or sourceUrl.'
    );
    expect(clientMocks.uploadVideo).not.toHaveBeenCalled();
  });

  it('decodes base64 input and defaults uploads to safe metadata behavior', async () => {
    clientMocks.uploadVideo.mockResolvedValue({
      video: {
        id: 'video-1',
        snippet: { title: 'Demo' },
        status: { privacyStatus: 'private', uploadStatus: 'uploaded' }
      },
      sourceType: 'base64',
      mimeType: 'video/mp4',
      sizeBytes: 5
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('upload_video', {
      title: 'Demo',
      contentBase64: Buffer.from('video').toString('base64'),
      mimeType: 'video/mp4'
    });

    expect(clientMocks.uploadVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Demo',
        content: Buffer.from('video'),
        sourceUrl: undefined
      })
    );
    expect(result.output).toMatchObject({
      videoId: 'video-1',
      privacyStatus: 'private',
      sourceType: 'base64',
      sizeBytes: 5
    });
  });

  it('returns caption bytes only through a Slate attachment', async () => {
    clientMocks.downloadCaption.mockResolvedValue({
      content: Buffer.from('WEBVTT'),
      mimeType: 'application/octet-stream'
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('download_caption', {
      captionId: 'caption/../1',
      format: 'vtt'
    });

    expect(result.output).toEqual({
      captionId: 'caption/../1',
      format: 'vtt',
      language: undefined,
      fileName: 'youtube-caption-caption____1.vtt',
      mimeType: 'application/octet-stream',
      sizeBytes: 6,
      attachmentCount: 1
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'application/octet-stream',
        content: {
          type: 'content',
          encoding: 'base64',
          content: Buffer.from('WEBVTT').toString('base64')
        }
      }
    ]);
    expect(JSON.stringify(result.output)).not.toContain('WEBVTT');
  });

  it('accepts BCP-47 caption translation tags and rejects malformed ones', async () => {
    clientMocks.downloadCaption.mockResolvedValue({
      content: Buffer.from('WEBVTT'),
      mimeType: 'text/vtt'
    });
    let client = createToolTestClient();

    for (let language of ['en', 'zh-Hans', 'pt-BR', 'sr-Latn-RS', 'ast']) {
      let result = await client.invokeTool('download_caption', {
        captionId: 'caption-1',
        language
      });
      expect(result.output.language).toBe(language);
      expect(clientMocks.downloadCaption).toHaveBeenCalledWith(
        expect.objectContaining({ language })
      );
    }

    for (let language of ['e', 'english', 'zh_Hans', 'pt-', '-BR', 'zh-Hans-']) {
      await expect(
        client.invokeTool('download_caption', {
          captionId: 'caption-1',
          language
        })
      ).rejects.toThrow();
    }
    expect(clientMocks.downloadCaption).toHaveBeenCalledTimes(5);
  });

  it('maps caption attachment file extensions from the format or response type', async () => {
    let client = createToolTestClient();
    let cases = [
      { format: 'srt', mimeType: 'application/octet-stream', extension: 'srt' },
      { format: undefined, mimeType: 'text/vtt', extension: 'vtt' },
      { format: undefined, mimeType: 'application/x-subrip', extension: 'srt' },
      { format: undefined, mimeType: 'application/ttml+xml', extension: 'ttml' },
      { format: undefined, mimeType: 'text/x-sbv', extension: 'sbv' },
      { format: undefined, mimeType: 'application/octet-stream', extension: 'txt' }
    ] as const;

    for (let testCase of cases) {
      clientMocks.downloadCaption.mockResolvedValueOnce({
        content: Buffer.from('caption'),
        mimeType: testCase.mimeType
      });

      let result = await client.invokeTool('download_caption', {
        captionId: 'caption-1',
        format: testCase.format
      });

      expect(result.output.fileName).toBe(`youtube-caption-caption-1.${testCase.extension}`);
    }
  });

  it('sets thumbnails and gets ratings through their dedicated API methods', async () => {
    clientMocks.setThumbnail.mockResolvedValue({
      items: [
        {
          default: {
            url: 'https://img.example.com/thumbnail.jpg',
            width: 120,
            height: 90
          },
          maxres: {
            url: 'https://img.example.com/thumbnail-maxres.jpg',
            width: 1280,
            height: 720
          }
        }
      ]
    });
    clientMocks.getVideoRating.mockResolvedValue({
      items: [{ videoId: 'video-1', rating: 'like' }]
    });
    let client = createToolTestClient();
    let image = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

    let thumbnail = await client.invokeTool('set_thumbnail', {
      videoId: 'video-1',
      contentBase64: image.toString('base64'),
      mimeType: 'image/jpeg'
    });
    let ratings = await client.invokeTool('get_video_rating', {
      videoIds: ['video-1']
    });

    expect(thumbnail.output.thumbnails).toEqual([
      {
        size: 'default',
        url: 'https://img.example.com/thumbnail.jpg',
        width: 120,
        height: 90
      },
      {
        size: 'maxres',
        url: 'https://img.example.com/thumbnail-maxres.jpg',
        width: 1280,
        height: 720
      }
    ]);
    expect(clientMocks.setThumbnail).toHaveBeenCalledWith({
      videoId: 'video-1',
      content: image,
      mimeType: 'image/jpeg'
    });
    expect(clientMocks.getVideoRating).toHaveBeenCalledWith(['video-1']);
    expect(ratings.output.ratings).toEqual([{ videoId: 'video-1', rating: 'like' }]);
  });

  it('rejects thumbnail bytes that do not match the declared media type', async () => {
    let client = createToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('set_thumbnail', {
          videoId: 'video-1',
          contentBase64: Buffer.from('not-a-jpeg').toString('base64'),
          mimeType: 'image/jpeg'
        }),
      'contentBase64 does not contain a valid image/jpeg signature.'
    );
    expect(clientMocks.setThumbnail).not.toHaveBeenCalled();
  });
});
