import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscriberEvent = SlateTrigger.create(spec, {
  name: 'Subscriber Event',
  key: 'subscriber_event',
  description:
    'Triggers when a subscriber is subscribed, modified, or deactivated on a Laposta mailing list. Covers subscribe/resubscribe, data modifications, and deactivation (unsubscribe, delete, hardbounce) events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: subscribed, modified, or deactivated'),
      eventReason: z
        .string()
        .optional()
        .describe(
          'Additional context for the event (e.g. subscribed, resubscribed, unsubscribed, deleted, hardbounce)'
        ),
      memberId: z.string().describe('ID of the affected subscriber'),
      listId: z.string().describe('ID of the list the subscriber belongs to'),
      email: z.string().describe('Email address of the subscriber'),
      state: z.string().describe('Current state of the subscriber'),
      signupDate: z.string().describe('Signup date of the subscriber'),
      ip: z.string().describe('IP address at signup'),
      sourceUrl: z.string().describe('Source URL at signup'),
      customFields: z.record(z.string(), z.string()).describe('Custom field values')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the affected subscriber'),
      listId: z.string().describe('ID of the list'),
      email: z.string().describe('Email address of the subscriber'),
      state: z.string().describe('Current state of the subscriber'),
      signupDate: z.string().describe('Signup date'),
      ip: z.string().describe('IP address at signup'),
      sourceUrl: z.string().describe('Source URL at signup'),
      customFields: z.record(z.string(), z.string()).describe('Custom field values'),
      eventReason: z.string().optional().describe('Specific reason for the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Laposta webhooks are per-list per-event, so we need to retrieve all lists
      // and register webhooks for all three event types on each list
      let listsResponse = await client.getLists();
      let registrations: Array<{ webhookId: string; listId: string; event: string }> = [];

      let events = ['subscribed', 'modified', 'deactivated'] as const;

      for (let listRes of listsResponse) {
        let listId = listRes.list.list_id;
        for (let event of events) {
          let result = await client.createWebhook({
            listId,
            event,
            url: ctx.input.webhookBaseUrl,
            blocked: false
          });
          registrations.push({
            webhookId: result.webhook.webhook_id,
            listId,
            event
          });
        }
      }

      return {
        registrationDetails: { webhooks: registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: string; listId: string }>;
      };

      for (let webhook of details.webhooks) {
        try {
          await client.deleteWebhook(webhook.webhookId, webhook.listId);
        } catch {
          // Webhook may already have been deleted (e.g., after 7 failed retries)
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Laposta bundles events in an array under the "data" key
      let events: any[] = Array.isArray(body.data)
        ? body.data
        : body.data
          ? [body.data]
          : [body];

      let inputs = events.map((event: any) => {
        let member = event.member ?? event;
        return {
          eventType: event.event ?? 'unknown',
          eventReason: event.reason ?? event.event ?? undefined,
          memberId: member.member_id ?? '',
          listId: member.list_id ?? '',
          email: member.email ?? '',
          state: member.state ?? '',
          signupDate: member.signup_date ?? '',
          ip: member.ip ?? '',
          sourceUrl: member.source_url ?? '',
          customFields: member.custom_fields ?? {}
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `subscriber.${ctx.input.eventType}`,
        id: `${ctx.input.memberId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          memberId: ctx.input.memberId,
          listId: ctx.input.listId,
          email: ctx.input.email,
          state: ctx.input.state,
          signupDate: ctx.input.signupDate,
          ip: ctx.input.ip,
          sourceUrl: ctx.input.sourceUrl,
          customFields: ctx.input.customFields,
          eventReason: ctx.input.eventReason
        }
      };
    }
  })
  .build();
