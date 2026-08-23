import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { channelSchema } from '../channels/channel';
import { threadSchema } from '../channels/thread';
import { messageSchema } from '../content/message';
import { emojiSchema } from '../shared/emoji';
import { rawSchema } from '../shared/raw';

export let actionInvokedSchema = z.object({
  actionId: z.string(),
  value: z.string().optional(),
  messageId: z.string(),
  channelId: z.string(),
  author: authorSchema,
  triggerId: z.string().optional(),
  selectedValues: z.record(z.string(), z.string()).optional(),
  message: messageSchema.optional(),
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  raw: rawSchema
});

export let modalSubmittedSchema = z.object({
  callbackId: z.string(),
  viewId: z.string(),
  values: z.record(z.string(), z.unknown()),
  author: authorSchema,
  privateMetadata: z.string().optional(),
  triggerId: z.string().optional(),
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  message: messageSchema.optional(),
  raw: rawSchema
});

export let modalClosedSchema = z.object({
  callbackId: z.string(),
  viewId: z.string().optional(),
  author: authorSchema,
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  raw: rawSchema
});

export let optionsLoadSchema = z.object({
  actionId: z.string(),
  query: z.string(),
  minQueryLength: z.number().int().optional(),
  raw: rawSchema
});

export let reactionEventSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  emoji: emojiSchema,
  author: authorSchema,
  message: messageSchema.optional(),
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  raw: rawSchema
});

export type ActionInvoked = z.infer<typeof actionInvokedSchema>;
export type ModalSubmitted = z.infer<typeof modalSubmittedSchema>;
export type ModalClosed = z.infer<typeof modalClosedSchema>;
export type OptionsLoad = z.infer<typeof optionsLoadSchema>;
export type ReactionEvent = z.infer<typeof reactionEventSchema>;
