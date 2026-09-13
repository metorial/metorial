import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { channelSchema } from '../channels/channel';
import { threadSchema } from '../channels/thread';
import { messageSchema } from '../content/message';
import { emojiSchema } from './emoji';
import { rawSchema } from './raw';

export let reactionCountSchema = z.object({
  emoji: emojiSchema,
  count: z.number().int().nonnegative(),
  authors: z.array(authorSchema).optional()
});

export type ReactionCount = z.infer<typeof reactionCountSchema>;

export let reactionEventSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  emoji: emojiSchema,
  author: authorSchema,
  message: z.lazy(() => messageSchema).optional(),
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  raw: rawSchema
});

export type ReactionEvent = z.infer<typeof reactionEventSchema>;
