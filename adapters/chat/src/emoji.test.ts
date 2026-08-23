import { describe, expect, it } from 'vitest';
import {
  EmojiResolver,
  parseEmoji,
  replaceSlackShortcodesInMarkdown,
  replaceUnicodeWithSlackShortcodes,
  toSlackShortcode,
  toUnicode
} from './emoji';

describe('emoji mapping', () => {
  it('normalizes :+1:, thumbsup, and 👍 to the same unicode value', () => {
    expect(parseEmoji(':+1:')).toEqual({ type: 'unicode', value: '👍' });
    expect(parseEmoji('thumbsup')).toEqual({ type: 'unicode', value: '👍' });
    expect(parseEmoji('👍')).toEqual({ type: 'unicode', value: '👍' });
    expect(parseEmoji({ type: 'unicode', value: '👍' })).toEqual({
      type: 'unicode',
      value: '👍'
    });
    expect(toUnicode('thumbs_up')).toBe('👍');
    expect(toSlackShortcode('👍')).toBe('+1');
  });

  it('treats unknown :party-blob: as custom', () => {
    expect(parseEmoji(':party-blob:')).toEqual({
      type: 'custom',
      name: 'party-blob'
    });
  });

  it('rewrites well-known shortcodes in markdown and leaves custom names', () => {
    expect(replaceSlackShortcodesInMarkdown('Nice :+1: :party-blob:')).toBe(
      'Nice 👍 :party-blob:'
    );
    expect(replaceUnicodeWithSlackShortcodes('Nice 👍')).toBe('Nice :+1:');
  });

  it('allows extending the map with extra aliases', () => {
    let resolver = new EmojiResolver();
    resolver.extend({
      thumbs_up: { slack: ['plusone'], unicode: '👍' }
    });
    expect(resolver.parseEmoji(':plusone:')).toEqual({ type: 'unicode', value: '👍' });
  });
});
