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

    expect(decodeSlackCursor(cursor)).toEqual({
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

    expect(() => decodeSlackCursor(invalid)).toThrow();
    expect(() => decodeSlackCursor(foreign)).toThrow(
      'Chat cursor belongs to discord, not slack'
    );
  });
});
