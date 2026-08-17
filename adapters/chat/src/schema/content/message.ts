import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { reactionCountSchema } from '../shared/reaction';
import { chatBodySchema } from './body';

export let messageMetadataSchema = z.object({
  sentAt: z.string().describe('ISO-8601 timestamp'),
  edited: z.boolean(),
  editedAt: z.string().optional()
});

export let messageSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  threadId: z.string().optional(),
  replyToId: z.string().optional(),
  author: authorSchema,
  body: chatBodySchema,
  reactions: z.array(reactionCountSchema).optional(),
  permalink: z.string().optional(),
  isMention: z.boolean().optional(),
  metadata: messageMetadataSchema
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type Message = z.infer<typeof messageSchema>;
