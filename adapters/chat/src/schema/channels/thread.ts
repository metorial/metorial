import { z } from 'zod';

export let threadSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  rootMessageId: z.string().optional(),
  replyCount: z.number().optional(),
  lastReplyAt: z.string().optional()
});

export type Thread = z.infer<typeof threadSchema>;
