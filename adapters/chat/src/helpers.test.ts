import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ChatError } from './errors';
import { matchesChatQuery } from './helpers';
import { decodeChatCursor, encodeCursor } from './schema';

let action = 'metorial_chat$channel.list';
let schema = z.object({ offset: z.number() });

let catchChatError = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    if (ChatError.is(error)) return error;
    throw error;
  }
  throw new Error('Expected a ChatError');
};

describe('decodeChatCursor', () => {
  it('decodes a cursor for its provider', () => {
    let cursor = encodeCursor('demo', { direction: 'forward', data: { offset: 5 } });
    expect(decodeChatCursor('demo', cursor, schema, { action })).toEqual({
      provider: 'demo',
      direction: 'forward',
      data: { offset: 5 }
    });
  });

  it('reports malformed, foreign, and invalid cursors as cursor_invalid', () => {
    let foreign = encodeCursor('other', { direction: 'forward', data: { offset: 5 } });
    let invalid = encodeCursor('demo', { direction: 'forward', data: { offset: 'x' } });
    for (let cursor of ['not json', foreign, invalid, '{}']) {
      let error = catchChatError(() => decodeChatCursor('demo', cursor, schema, { action }));
      expect(error.chat).toMatchObject({ code: 'chat.input.cursor_invalid', action });
    }

    let custom = catchChatError(() =>
      decodeChatCursor('demo', 'nope', schema, { action, message: 'Start over.' })
    );
    expect(custom.message).toBe('Start over.');
  });
});

describe('matchesChatQuery', () => {
  it('matches trimmed, case-insensitive substrings', () => {
    expect(matchesChatQuery(undefined, ['Acme'])).toBe(true);
    expect(matchesChatQuery('   ', ['Acme'])).toBe(true);
    expect(matchesChatQuery(' acm ', ['Acme'])).toBe(true);
    expect(matchesChatQuery('bot', [undefined, null, 'MyBot'])).toBe(true);
    expect(matchesChatQuery('zzz', ['Acme', undefined])).toBe(false);
  });
});
