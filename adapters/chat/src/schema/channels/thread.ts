import { z } from 'zod';
import { chatContextSchema } from '../shared/context';
import { rawSchema } from '../shared/raw';

export let threadTypeSchema = z.enum(['conversation', 'dm', 'post']);

export type ThreadType = z.infer<typeof threadTypeSchema>;

export let threadSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  type: threadTypeSchema,
  providerType: z.string().optional(),
  subject: z.string().optional(),
  context: chatContextSchema.optional(),
  permalink: z.string().optional(),
  rootMessageId: z.string().optional(),
  replyCount: z.number().optional(),
  lastReplyAt: z.string().optional(),
  raw: rawSchema
});

export type Thread = z.infer<typeof threadSchema>;
