import { ChatErrors, type EmojiInput, parseEmoji } from '@slates/adapter-chat';

let CUSTOM_MARKUP = /^<a?:([\w~-]+):(\d+)>$/;
let CUSTOM_PAIR = /^:?([\w~-]+):(\d+):?$/;

/**
 * Converts a chat emoji to Discord's reaction route form: the Unicode character, or
 * `name:id` for a custom emoji (the client URL-encodes it).
 * https://docs.discord.com/developers/resources/message#create-reaction
 */
export let toDiscordReactionEmoji = (input: EmojiInput, action: string): string => {
  if (typeof input === 'string') {
    let trimmed = input.trim();
    let match = CUSTOM_MARKUP.exec(trimmed) ?? CUSTOM_PAIR.exec(trimmed);
    if (match) return `${match[1]}:${match[2]}`;
  }

  let emoji = parseEmoji(input);
  if (emoji.type === 'unicode') {
    if (!emoji.value) throw ChatErrors.emojiNotFound({ action, message: 'Emoji is empty.' });
    return emoji.value;
  }

  if (emoji.id) return `${emoji.name}:${emoji.id}`;

  throw ChatErrors.emojiNotFound({
    action,
    emoji: emoji.name,
    message: `Discord custom emoji need an id; pass { type: 'custom', name: '${emoji.name}', id } or '<:${emoji.name}:ID>'.`
  });
};
