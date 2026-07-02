import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let CONVERSATION_EVENTS = [
  'convo.assigned',
  'convo.created',
  'convo.deleted',
  'convo.merged',
  'convo.moved',
  'convo.status',
  'convo.tags',
  'convo.custom-fields',
  'convo.customer.reply.created',
  'convo.agent.reply.created',
  'convo.note.created'
] as const;

export let conversationEvents = SlateTrigger.create(spec, {
  name: 'Conversation Events',
  key: 'conversation_events',
  description:
    'Triggered when conversations are created, updated, assigned, merged, moved, or when replies and notes are added.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Help Scout event type (e.g. convo.created, convo.assigned)'),
      conversationId: z.number().describe('Conversation ID'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z.string().nullable().describe('Conversation status'),
      mailboxId: z.number().nullable().describe('Mailbox ID'),
      assigneeId: z.number().nullable().describe('Assigned user ID'),
      customerEmail: z.string().nullable().describe('Customer email'),
      tags: z.array(z.string()).describe('Conversation tags'),
      threadBody: z.string().nullable().describe('Thread body (for reply/note events)'),
      threadType: z.string().nullable().describe('Thread type (for reply/note events)'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Conversation ID'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z.string().nullable().describe('Conversation status'),
      mailboxId: z.number().nullable().describe('Mailbox ID'),
      assigneeId: z.number().nullable().describe('Assigned user ID'),
      customerEmail: z.string().nullable().describe('Customer email'),
      tags: z.array(z.string()).describe('Conversation tags'),
      threadBody: z.string().nullable().describe('Thread body (for reply/note events)'),
      threadType: z.string().nullable().describe('Thread type (for reply/note events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...CONVERSATION_EVENTS],
        secret,
        payloadVersion: 'V2'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(Number(webhookId));
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventType = data?.event ?? data?.eventType ?? '';
      let conversation = data?.payload?.conversation ?? data?.conversation ?? data ?? {};
      let thread = data?.payload?.thread ?? data?.thread ?? null;

      let conversationId = conversation.id ?? 0;
      let subject = conversation.subject ?? null;
      let status = conversation.status ?? null;
      let mailboxId = conversation.mailboxId ?? null;
      let assigneeId = conversation.assignee?.id ?? null;
      let customerEmail =
        conversation.primaryCustomer?.email ?? conversation.customer?.email ?? null;
      let tags = (conversation.tags ?? []).map((t: any) =>
        typeof t === 'string' ? t : (t.tag ?? t.name ?? '')
      );

      let threadBody = thread?.body ?? null;
      let threadType = thread?.type ?? null;

      let webhookId = `${eventType}-${conversationId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            conversationId,
            subject,
            status,
            mailboxId,
            assigneeId,
            customerEmail,
            tags,
            threadBody,
            threadType,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'convo.assigned': 'conversation.assigned',
        'convo.created': 'conversation.created',
        'convo.deleted': 'conversation.deleted',
        'convo.merged': 'conversation.merged',
        'convo.moved': 'conversation.moved',
        'convo.status': 'conversation.status_updated',
        'convo.tags': 'conversation.tags_updated',
        'convo.custom-fields': 'conversation.custom_fields_updated',
        'convo.customer.reply.created': 'conversation.customer_reply',
        'convo.agent.reply.created': 'conversation.agent_reply',
        'convo.note.created': 'conversation.note_created'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `conversation.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: {
          conversationId: ctx.input.conversationId,
          subject: ctx.input.subject,
          status: ctx.input.status,
          mailboxId: ctx.input.mailboxId,
          assigneeId: ctx.input.assigneeId,
          customerEmail: ctx.input.customerEmail,
          tags: ctx.input.tags,
          threadBody: ctx.input.threadBody,
          threadType: ctx.input.threadType
        }
      };
    }
  })
  .build();
