import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { emojiSchema } from '../shared/emoji';

export let actionInvokedSchema = z.object({
  actionId: z.string(),
  value: z.string().optional(),
  messageId: z.string(),
  channelId: z.string(),
  author: authorSchema,
  triggerId: z.string().optional(),
  selectedValues: z.record(z.string(), z.string()).optional()
});

export let modalSubmittedSchema = z.object({
  callbackId: z.string(),
  viewId: z.string(),
  values: z.record(z.string(), z.unknown()),
  author: authorSchema,
  privateMetadata: z.string().optional(),
  triggerId: z.string().optional()
});

export let modalClosedSchema = z.object({
  callbackId: z.string(),
  viewId: z.string().optional(),
  author: authorSchema
});

export let optionsLoadSchema = z.object({
  actionId: z.string(),
  query: z.string(),
  minQueryLength: z.number().int().optional()
});

export let reactionEventSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  emoji: emojiSchema,
  author: authorSchema
});

export type ActionInvoked = z.infer<typeof actionInvokedSchema>;
export type ModalSubmitted = z.infer<typeof modalSubmittedSchema>;
export type ModalClosed = z.infer<typeof modalClosedSchema>;
export type OptionsLoad = z.infer<typeof optionsLoadSchema>;
export type ReactionEvent = z.infer<typeof reactionEventSchema>;
