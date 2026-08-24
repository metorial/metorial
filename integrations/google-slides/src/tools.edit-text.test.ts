import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  deleteText: vi.fn(),
  updateTextStyle: vi.fn(),
  createParagraphBullets: vi.fn()
}));

vi.mock('./lib/client', async importOriginal => {
  let actual = await importOriginal<typeof import('./lib/client')>();
  return {
    ...actual,
    SlidesClient: class {
      deleteText(...args: unknown[]) {
        return clientMocks.deleteText(...args);
      }

      updateTextStyle(...args: unknown[]) {
        return clientMocks.updateTextStyle(...args);
      }

      createParagraphBullets(...args: unknown[]) {
        return clientMocks.createParagraphBullets(...args);
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

describe('edit_text tool ranges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMocks.deleteText.mockResolvedValue({ replies: [] });
    clientMocks.updateTextStyle.mockResolvedValue({ replies: [] });
    clientMocks.createParagraphBullets.mockResolvedValue({ replies: [] });
  });

  it('uses Google Slides ALL range for whole-element deletion', async () => {
    let result = await createToolTestClient().invokeTool('edit_text', {
      presentationId: 'presentation-1',
      elementObjectId: 'element-1',
      action: 'delete',
      rangeType: 'all'
    });

    expect(clientMocks.deleteText).toHaveBeenCalledWith('presentation-1', 'element-1', {
      type: 'ALL'
    });
    expect(result.message).toBe('Deleted all text from element `element-1`.');
  });

  it('uses Google Slides ALL range for whole-element styling', async () => {
    await createToolTestClient().invokeTool('edit_text', {
      presentationId: 'presentation-1',
      elementObjectId: 'element-1',
      action: 'style',
      rangeType: 'all',
      fontSize: 12
    });

    expect(clientMocks.updateTextStyle).toHaveBeenCalledWith(
      'presentation-1',
      'element-1',
      { fontSize: { magnitude: 12, unit: 'PT' } },
      { type: 'ALL' },
      'fontSize'
    );
  });

  it('preserves fixed partial ranges for backward compatibility', async () => {
    await createToolTestClient().invokeTool('edit_text', {
      presentationId: 'presentation-1',
      elementObjectId: 'element-1',
      action: 'delete',
      startIndex: 2,
      endIndex: 5
    });

    expect(clientMocks.deleteText).toHaveBeenCalledWith('presentation-1', 'element-1', {
      type: 'FIXED_RANGE',
      startIndex: 2,
      endIndex: 5
    });
  });

  it('uses Google Slides ALL range for whole-element bullet formatting', async () => {
    await createToolTestClient().invokeTool('edit_text', {
      presentationId: 'presentation-1',
      elementObjectId: 'element-1',
      action: 'bullets',
      rangeType: 'all'
    });

    expect(clientMocks.createParagraphBullets).toHaveBeenCalledWith(
      'presentation-1',
      'element-1',
      { type: 'ALL' },
      'BULLET_DISC_CIRCLE_SQUARE'
    );
  });

  it('rejects empty fixed ranges before calling Google Slides', async () => {
    await expect(
      createToolTestClient().invokeTool('edit_text', {
        presentationId: 'presentation-1',
        elementObjectId: 'element-1',
        action: 'style',
        startIndex: 0,
        endIndex: 0,
        fontSize: 5
      })
    ).rejects.toThrow(
      'endIndex must be greater than startIndex. Use rangeType "all" to target all text without calculating indexes.'
    );

    expect(clientMocks.updateTextStyle).not.toHaveBeenCalled();
  });

  it('rejects indexes combined with the all-text range', async () => {
    await expect(
      createToolTestClient().invokeTool('edit_text', {
        presentationId: 'presentation-1',
        elementObjectId: 'element-1',
        action: 'delete',
        rangeType: 'all',
        startIndex: 0,
        endIndex: 20
      })
    ).rejects.toThrow('Omit startIndex and endIndex when rangeType is "all".');

    expect(clientMocks.deleteText).not.toHaveBeenCalled();
  });

  it('rejects insert and style actions with missing required values', async () => {
    let client = createToolTestClient();

    await expect(
      client.invokeTool('edit_text', {
        presentationId: 'presentation-1',
        elementObjectId: 'element-1',
        action: 'insert'
      })
    ).rejects.toThrow('text is required for insert action');

    await expect(
      client.invokeTool('edit_text', {
        presentationId: 'presentation-1',
        elementObjectId: 'element-1',
        action: 'style',
        rangeType: 'all'
      })
    ).rejects.toThrow('At least one style property must be provided for style action');
  });
});
