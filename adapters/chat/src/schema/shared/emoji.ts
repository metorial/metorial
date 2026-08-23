import { z } from 'zod';

export let unicodeEmojiSchema = z.object({
  type: z.literal('unicode'),
  value: z.string()
});

export let customEmojiSchema = z.object({
  type: z.literal('custom'),
  name: z.string(),
  url: z.string().optional(),
  id: z.string().optional()
});

export let emojiSchema = z.discriminatedUnion('type', [unicodeEmojiSchema, customEmojiSchema]);

export type UnicodeEmoji = z.infer<typeof unicodeEmojiSchema>;
export type CustomEmoji = z.infer<typeof customEmojiSchema>;
export type Emoji = z.infer<typeof emojiSchema>;

export let emojiInputSchema = z.union([z.string(), emojiSchema]);

export type EmojiInput = z.infer<typeof emojiInputSchema>;
