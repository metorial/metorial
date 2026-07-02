import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let guestMessageReceived = SlateTrigger.create(spec, {
  name: 'Guest Message Received',
  key: 'guest_message_received',
  description:
    'Triggers when a new guest message is received in any conversation thread, whether associated with a booking or an enquiry.'
})
  .input(
    z.object({
      action: z.string().describe('The webhook action type'),
      threadUid: z.string().describe('Unique ID of the message thread'),
      messageId: z.number().describe('ID of the new message'),
      inboxUid: z.string().optional().describe('Inbox identifier'),
      guestName: z.string().optional().describe('Name of the guest who sent the message'),
      subject: z.string().optional().nullable().describe('Message subject'),
      messageContent: z.string().optional().describe('Message body content'),
      creationTime: z.string().optional().describe('When the message was created'),
      hasAttachments: z
        .boolean()
        .optional()
        .describe('Whether the message has file attachments')
    })
  )
  .output(
    z.object({
      threadUid: z.string().describe('Unique ID of the message thread'),
      messageId: z.number().describe('ID of the new message'),
      inboxUid: z.string().optional().describe('Inbox identifier (e.g., booking reference)'),
      guestName: z.string().optional().describe('Name of the guest who sent the message'),
      subject: z.string().optional().nullable().describe('Message subject if provided'),
      messageContent: z.string().optional().describe('The message body'),
      creationTime: z.string().optional().describe('When the message was sent'),
      hasAttachments: z
        .boolean()
        .optional()
        .describe('Whether the message includes file attachments')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.subscribeWebhook(
        'guest_message_received',
        ctx.input.webhookBaseUrl
      );

      return {
        registrationDetails: {
          webhookId: String(result.id ?? result.webhook_id ?? result),
          secret: result.secret ?? result.signing_secret ?? ''
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };

      try {
        await client.unsubscribeWebhook(details.webhookId);
      } catch (_e) {
        // Best-effort unregistration
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [
          {
            action: (data.action as string) ?? 'guest_message_received',
            threadUid: (data.thread_uid as string) ?? '',
            messageId: Number(data.message_id ?? 0),
            inboxUid: data.inbox_uid as string | undefined,
            guestName: data.guest_name as string | undefined,
            subject: data.subject as string | undefined | null,
            messageContent: data.message as string | undefined,
            creationTime: data.creation_time as string | undefined,
            hasAttachments: data.has_attachments as boolean | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.received',
        id: `message-${ctx.input.messageId}-${ctx.input.threadUid}`,
        output: {
          threadUid: ctx.input.threadUid,
          messageId: ctx.input.messageId,
          inboxUid: ctx.input.inboxUid,
          guestName: ctx.input.guestName,
          subject: ctx.input.subject,
          messageContent: ctx.input.messageContent,
          creationTime: ctx.input.creationTime,
          hasAttachments: ctx.input.hasAttachments
        }
      };
    }
  })
  .build();
