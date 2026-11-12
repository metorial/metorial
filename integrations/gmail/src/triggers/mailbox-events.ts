import {
  googlePubSubDeliveryConfig,
  verifyGooglePubSubPushForProcessing
} from '@slates/google-pubsub';
import {
  createApiServiceError,
  parseWithServiceError,
  SlateTrigger,
  skipWebhook,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  emailReceivedSchema,
  mailboxRegistrationSchema,
  mailboxWakeupSchema
} from './event-schemas';
import { assertMailbox, gmailAutoRegistration } from './registration';
import { syncMailbox } from './sync';

export const mailboxEvents = triggerGroup(spec, {
  key: 'mailbox_events',
  name: 'Incoming email',
  description: 'Newly added incoming messages, including replies and mail archived by rules.',
  eventSchema: z.object({ kind: z.enum(['mailbox_wakeup', 'email_received']) }).passthrough()
})
  .webhook({
    googlePubSub: { product: 'gmail' },
    deliveryConfig: googlePubSubDeliveryConfig('gmail'),
    autoRegistration: gmailAutoRegistration,
    reconcileIntervalSeconds: 900,
    process: async ctx => {
      const registration = mailboxRegistrationSchema.safeParse(
        ctx.input.webhookRegistrationPayload
      );
      if (!registration.success) return skipWebhook('invalid_registration', { status: 500 });
      const { delivery, mailbox } = registration.data;
      const verified = await verifyGooglePubSubPushForProcessing(ctx.input.request, delivery);
      if (!verified.ok) return verified.skipped;
      const data =
        typeof verified.message.data === 'object' && verified.message.data !== null
          ? (verified.message.data as Record<string, unknown>)
          : {};
      // Gmail sends historyId as a JSON number.
      const historyId =
        typeof data.historyId === 'number' && Number.isInteger(data.historyId)
          ? BigInt(data.historyId).toString()
          : data.historyId;
      const parsed = mailboxWakeupSchema.safeParse({
        ...data,
        historyId,
        kind: 'mailbox_wakeup'
      });
      if (!parsed.success) return skipWebhook('invalid_gmail_notification', { status: 400 });
      if (parsed.data.emailAddress.toLowerCase() !== mailbox)
        return skipWebhook('mailbox_mismatch', { status: 403 });
      return {
        events: [
          {
            matchers: [],
            payload: { ...parsed.data, emailAddress: mailbox },
            idempotencyKey: `${delivery.subscriptionName}:${verified.message.messageId}`
          }
        ]
      };
    },
    expandWebhook: async ctx => {
      const saved = parseWithServiceError(
        mailboxRegistrationSchema,
        ctx.input.webhookRegistrationPayload,
        'The saved Gmail mailbox watch is invalid.'
      );
      if (ctx.input.payload !== null) {
        const payload = parseWithServiceError(
          mailboxWakeupSchema,
          ctx.input.payload,
          'The Gmail mailbox notification is invalid.'
        );
        if (payload.emailAddress !== saved.mailbox)
          throw createApiServiceError(
            'The Gmail mailbox notification belongs to another account.'
          );
      }
      const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
      await assertMailbox(client, saved);
      // Notification history IDs are only hints; always advance from fully fetched history.
      return syncMailbox(client, saved, ctx.input.state);
    }
  })
  .routingMatchers(async () => [])
  .build();

export const emailReceived = SlateTrigger.create(spec, {
  key: 'email_received',
  name: 'Email received',
  description:
    'A new incoming message was observed in your mailbox. Includes self-addressed mail and imports; excludes drafts, ordinary outbound mail, chats, spam and trash.'
})
  .triggerGroup(mailboxEvents)
  .input(emailReceivedSchema)
  .output(emailReceivedSchema)
  .scopes(gmailActionScopes.getMessage)
  .matches(payload => emailReceivedSchema.safeParse(payload).success)
  .map(async ctx => ({
    type: 'gmail.email.received',
    id: ctx.input.eventId,
    output: ctx.input
  }))
  .build();
