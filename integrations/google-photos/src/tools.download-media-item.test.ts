import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  downloadMediaItem: vi.fn()
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();
  return {
    ...actual,
    GooglePhotosLibraryClient: class {
      downloadMediaItem(...args: unknown[]) {
        return clientMocks.downloadMediaItem(...args);
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
        authenticationMethodId: 'google_oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('download_media_item tool behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns media bytes only through one attachment with a safe file name', async () => {
    let jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    clientMocks.downloadMediaItem.mockResolvedValue({
      mediaItemId: 'photo/../1',
      filename: '../../holiday<script>.jpeg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      content: jpeg
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('download_media_item', {
      mediaItemId: 'photo/../1'
    });

    expect(clientMocks.downloadMediaItem).toHaveBeenCalledWith('photo/../1');
    expect(result.output).toEqual({
      mediaItemId: 'photo/../1',
      fileName: 'holiday_script.jpg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      sizeBytes: 4,
      attachmentCount: 1
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'image/jpeg',
        content: {
          type: 'content',
          encoding: 'base64',
          content: jpeg.toString('base64')
        }
      }
    ]);
    expect(result.output).not.toHaveProperty('baseUrl');
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(JSON.stringify(result.output)).not.toContain(jpeg.toString('base64'));
  });

  it('builds a bounded fallback name from the media item ID and MIME type', async () => {
    clientMocks.downloadMediaItem.mockResolvedValue({
      mediaItemId: '../video:id',
      mimeType: 'video/mp4',
      mediaType: 'video',
      content: Buffer.from([1])
    });

    let result = await createToolTestClient().invokeTool('download_media_item', {
      mediaItemId: '../video:id'
    });

    expect(result.output.fileName).toBe('google-photos-video_id.mp4');
  });

  it('avoids reserved device names and trims the requested media item ID', async () => {
    clientMocks.downloadMediaItem.mockResolvedValue({
      mediaItemId: 'photo-1',
      filename: 'CON.jpeg',
      mimeType: 'image/jpeg',
      mediaType: 'photo',
      content: Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    });

    let result = await createToolTestClient().invokeTool('download_media_item', {
      mediaItemId: '  photo-1  '
    });

    expect(clientMocks.downloadMediaItem).toHaveBeenCalledWith('photo-1');
    expect(result.output.fileName).toBe('media-CON.jpg');
  });
});
