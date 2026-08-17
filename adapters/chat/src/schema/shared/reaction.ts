import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { emojiSchema } from './emoji';

export let reactionCountSchema = z.object({
  emoji: emojiSchema,
  count: z.number().int().nonnegative(),
  authors: z.array(authorSchema).optional()
});

export type ReactionCount = z.infer<typeof reactionCountSchema>;
