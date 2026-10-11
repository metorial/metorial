import { encodeCursor } from '@slates/adapter-chat';
import { describe, expect, it } from 'vitest';
import { decodeSlackCursor, encodeSlackCursor } from './cursors';

describe('Slack chat cursors', () => {
  it('round-trips validated Slack cursor data', () => {
    let cursor = encodeSlackCursor('backward', {
      cursor: 'next-page',
      page: 2,
      timestamp: '123.456'
    });

    expect(decodeSlackCursor(cursor, 'backward', 'test')).toEqual({
      direction: 'backward',
      data: { cursor: 'next-page', page: 2, timestamp: '123.456' }
    });
  });

  it('rejects invalid data and cursors from another provider', () => {
    let invalid = encodeCursor('slack', {
      direction: 'forward',
      data: { page: -1 }
    });
    let foreign = encodeCursor('discord', {
      direction: 'forward',
      data: { page: 1 }
    });

    expect(() => decodeSlackCursor(invalid, 'backward', 'test')).toThrow();
    expect(() => decodeSlackCursor(foreign, 'backward', 'test')).toThrow(
      expect.objectContaining({
        chat: expect.objectContaining({ code: 'chat.input.cursor_invalid' })
      })
    );
  });
});
