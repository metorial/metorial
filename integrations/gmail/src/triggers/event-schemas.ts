import { googlePubSubInfrastructureSchema } from '@slates/google-pubsub';
import { z } from 'zod';

export const historyIdSchema = z.string().regex(/^[1-9]\d*$/);
export const mailboxTargetSchema = z.object({
  accountId: z.string().min(1),
  mailbox: z.email()
});
export const mailboxRegistrationSchema = mailboxTargetSchema.extend({
  initialHistoryId: historyIdSchema,
  activatedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  delivery: googlePubSubInfrastructureSchema
});
export type MailboxRegistration = z.infer<typeof mailboxRegistrationSchema>;
export const mailboxWakeupSchema = z.object({
  kind: z.literal('mailbox_wakeup'),
  emailAddress: z.email(),
  historyId: historyIdSchema
});
export const mailboxStateSchema = z.object({
  version: z.literal(1),
  accountId: z.string().min(1),
  mailbox: z.email(),
  historyId: historyIdSchema,
  historyPageToken: z.string().min(1).optional(),
  checkedAt: z.iso.datetime(),
  seen: z.record(z.string(), z.number().int().nonnegative()),
  lastRecovery: z
    .object({
      observedAt: z.iso.datetime(),
      since: z.iso.datetime(),
      outageExceededWindow: z.boolean(),
      pending: z
        .object({
          pageToken: z.string().min(1).optional(),
          handled: z.number().int().nonnegative()
        })
        .optional(),
      incomplete: z.boolean().optional()
    })
    .optional()
});
export type MailboxState = z.infer<typeof mailboxStateSchema>;
export const emailReceivedSchema = z.object({
  kind: z.literal('email_received'),
  eventId: z.string(),
  accountId: z.string(),
  mailbox: z.email(),
  messageId: z.string().min(1),
  threadId: z.string().min(1),
  labelIds: z.array(z.string()),
  from: z.string(),
  to: z.string(),
  cc: z.string(),
  bcc: z.string(),
  subject: z.string(),
  snippet: z.string(),
  internalDate: z.string(),
  messageTime: z.iso.datetime(),
  observedAt: z.iso.datetime(),
  source: z.enum(['history', 'recovery']),
  hasAttachments: z.boolean(),
  attachments: z.array(
    z.object({
      attachmentId: z.string().optional(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number().nonnegative()
    })
  )
});
export type EmailReceived = z.infer<typeof emailReceivedSchema>;
