import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  getPageThumbnail: vi.fn()
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();
  return {
    ...actual,
    SlidesClient: class {
      getPageThumbnail(...args: unknown[]) {
        return clientMocks.getPageThumbnail(...args);
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

describe('get_slide_thumbnail tool behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns PNG bytes only through one Slate attachment', async () => {
    let png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    clientMocks.getPageThumbnail.mockResolvedValue({
      width: 200,
      height: 113,
      mimeType: 'image/png',
      content: png
    });
    let client = createToolTestClient();

    let result = await client.invokeTool('get_slide_thumbnail', {
      presentationId: 'presentation-1',
      pageObjectId: 'slide/../1',
      thumbnailSize: 'SMALL'
    });

    expect(clientMocks.getPageThumbnail).toHaveBeenCalledWith(
      'presentation-1',
      'slide/../1',
      'SMALL'
    );
    expect(result.output).toEqual({
      presentationId: 'presentation-1',
      pageObjectId: 'slide/../1',
      thumbnailSize: 'SMALL',
      widthPixels: 200,
      heightPixels: 113,
      mimeType: 'image/png',
      sizeBytes: 8,
      fileName: 'google-slides-slide____1-thumbnail.png',
      attachmentCount: 1
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'image/png',
        content: {
          type: 'content',
          encoding: 'base64',
          content: png.toString('base64')
        }
      }
    ]);
    expect(result.output).not.toHaveProperty('contentUrl');
    expect(JSON.stringify(result.output)).not.toContain(png.toString('base64'));
  });
});
