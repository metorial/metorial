import type { Emoji, EmojiInput } from '../schema/shared/emoji';
import { DEFAULT_EMOJI_MAP, type EmojiFormats } from './map';

let asList = (value: string | string[]) => (Array.isArray(value) ? value : [value]);

export class EmojiResolver {
  #emojiMap: Record<string, EmojiFormats>;
  #slackToName = new Map<string, string>();
  #unicodeToName = new Map<string, string>();

  constructor(customMap?: Record<string, EmojiFormats>) {
    this.#emojiMap = { ...DEFAULT_EMOJI_MAP, ...customMap };
    this.rebuildIndexes();
  }

  extend(customMap: Record<string, EmojiFormats>) {
    Object.assign(this.#emojiMap, customMap);
    this.rebuildIndexes();
  }

  parseEmoji(input: EmojiInput): Emoji {
    if (typeof input !== 'string') {
      if (input.type === 'unicode') {
        let mapped = this.#unicodeToName.get(input.value);
        if (mapped) return { type: 'unicode', value: this.toUnicode(mapped) };
        return input;
      }

      let mapped = this.#slackToName.get(input.name.toLowerCase());
      if (mapped) return { type: 'unicode', value: this.toUnicode(mapped) };
      return input;
    }

    let trimmed = input.trim();
    let unicodeName = this.#unicodeToName.get(trimmed);
    if (unicodeName) {
      return { type: 'unicode', value: this.toUnicode(unicodeName) };
    }

    let cleaned = trimmed.replace(/^:|:$/g, '').toLowerCase();
    let slackName = this.#slackToName.get(cleaned);
    if (slackName) {
      return { type: 'unicode', value: this.toUnicode(slackName) };
    }

    if (/^:[^:]+:$/.test(trimmed) || /^[a-z0-9_+-]+$/i.test(cleaned)) {
      return { type: 'custom', name: cleaned };
    }

    return { type: 'unicode', value: trimmed };
  }

  toUnicode(nameOrEmoji: string | Emoji): string {
    if (typeof nameOrEmoji !== 'string') {
      if (nameOrEmoji.type === 'unicode') return nameOrEmoji.value;
      return `:${nameOrEmoji.name}:`;
    }

    let formats = this.#emojiMap[nameOrEmoji];
    if (formats) return asList(formats.unicode)[0]!;

    let fromSlack = this.#slackToName.get(nameOrEmoji.replace(/^:|:$/g, '').toLowerCase());
    if (fromSlack) return asList(this.#emojiMap[fromSlack]!.unicode)[0]!;

    let fromUnicode = this.#unicodeToName.get(nameOrEmoji);
    if (fromUnicode) return asList(this.#emojiMap[fromUnicode]!.unicode)[0]!;

    return nameOrEmoji;
  }

  toSlackShortcode(nameOrEmoji: string | Emoji): string {
    if (typeof nameOrEmoji !== 'string') {
      if (nameOrEmoji.type === 'custom') return nameOrEmoji.name;
      let mapped = this.#unicodeToName.get(nameOrEmoji.value);
      if (mapped) return asList(this.#emojiMap[mapped]!.slack)[0]!;
      return nameOrEmoji.value;
    }

    let formats = this.#emojiMap[nameOrEmoji];
    if (formats) return asList(formats.slack)[0]!;

    let fromSlack = this.#slackToName.get(nameOrEmoji.replace(/^:|:$/g, '').toLowerCase());
    if (fromSlack) return asList(this.#emojiMap[fromSlack]!.slack)[0]!;

    let fromUnicode = this.#unicodeToName.get(nameOrEmoji);
    if (fromUnicode) return asList(this.#emojiMap[fromUnicode]!.slack)[0]!;

    return nameOrEmoji.replace(/^:|:$/g, '');
  }

  replaceSlackShortcodesInMarkdown(markdown: string): string {
    return markdown.replace(/:([a-z0-9_+-]+):/gi, (match, shortcode: string) => {
      let name = this.#slackToName.get(shortcode.toLowerCase());
      if (!name) return match;
      return asList(this.#emojiMap[name]!.unicode)[0]!;
    });
  }

  replaceUnicodeWithSlackShortcodes(markdown: string): string {
    let result = markdown;
    let replacements = [...this.#unicodeToName.entries()].sort(
      (a, b) => b[0].length - a[0].length
    );

    for (let [unicode, name] of replacements) {
      if (!result.includes(unicode)) continue;
      let shortcode = asList(this.#emojiMap[name]!.slack)[0]!;
      result = result.split(unicode).join(`:${shortcode}:`);
    }

    return result;
  }

  private rebuildIndexes() {
    this.#slackToName = new Map();
    this.#unicodeToName = new Map();

    for (let [name, formats] of Object.entries(this.#emojiMap)) {
      for (let slack of asList(formats.slack)) {
        this.#slackToName.set(slack.toLowerCase(), name);
      }
      for (let unicode of asList(formats.unicode)) {
        this.#unicodeToName.set(unicode, name);
      }
    }
  }
}

export let defaultEmojiResolver = new EmojiResolver();

export let parseEmoji = (input: EmojiInput) => defaultEmojiResolver.parseEmoji(input);

export let toUnicode = (nameOrEmoji: string | Emoji) =>
  defaultEmojiResolver.toUnicode(nameOrEmoji);

export let toSlackShortcode = (nameOrEmoji: string | Emoji) =>
  defaultEmojiResolver.toSlackShortcode(nameOrEmoji);

export let replaceSlackShortcodesInMarkdown = (markdown: string) =>
  defaultEmojiResolver.replaceSlackShortcodesInMarkdown(markdown);

export let replaceUnicodeWithSlackShortcodes = (markdown: string) =>
  defaultEmojiResolver.replaceUnicodeWithSlackShortcodes(markdown);
