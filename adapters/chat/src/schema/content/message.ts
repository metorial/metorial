import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { channelSchema } from '../channels/channel';
import { threadSchema } from '../channels/thread';
import { rawSchema } from '../shared/raw';
import { reactionCountSchema } from '../shared/reaction';
import { chatBodySchema } from './body';

export let messageMetadataSchema = z.object({
  sentAt: z.string().describe('ISO-8601 timestamp'),
  edited: z.boolean(),
  editedAt: z.string().optional()
});

export let linkUnfurlSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  siteName: z.string().optional(),
  messageId: z.string().optional()
});

let messageFields = {
  id: z.string(),
  channelId: z.string(),
  threadId: z.string().optional(),
  author: authorSchema,
  body: chatBodySchema,
  reactions: z.array(reactionCountSchema).optional(),
  permalink: z.string().optional(),
  isMention: z.boolean().optional(),
  unfurls: z.array(linkUnfurlSchema).optional(),
  providerType: z.string().optional(),
  metadata: messageMetadataSchema,
  raw: rawSchema
};

export let messageSnapshotSchema = z.object({
  ...messageFields,
  reply: z
    .object({
      id: z.string().optional()
    })
    .optional()
});

export let replyRefSchema = z.object({
  id: z.string().optional(),
  reference: messageSnapshotSchema.optional()
});

export let messageSchema = z.object({
  ...messageFields,
  reply: replyRefSchema.optional()
});

export let messageResultSchema = z.object({
  message: messageSchema,
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  raw: rawSchema
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type LinkUnfurl = z.infer<typeof linkUnfurlSchema>;
export type MessageSnapshot = z.infer<typeof messageSnapshotSchema>;
export type ReplyRef = z.infer<typeof replyRefSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageResult = z.infer<typeof messageResultSchema>;
