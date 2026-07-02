import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let eventTrigger = SlateTrigger.create(spec, {
  name: 'New Calendar Event',
  key: 'new_event',
  description: 'Triggers when a new calendar event is added in Project Bubble.'
})
  .input(
    z.object({
      resourceUrl: z.string().describe('URL to the event resource')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      eventName: z.string().describe('Event name'),
      startDate: z.string().optional().describe('Event start date'),
      dueDate: z.string().optional().describe('Event due date'),
      projectId: z.string().optional().describe('Associated project ID'),
      userId: z.string().optional().describe('Creator user ID'),
      dateCreated: z.string().optional().describe('Date created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.subscribeWebhook(ctx.input.webhookBaseUrl, 'new_event');
      let subscriptionId = String(
        result?.id || result?.data?.id || result?.subscription_id || ''
      );

      return {
        registrationDetails: { subscriptionId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      await client.unsubscribeWebhook(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            resourceUrl: data.resource_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.fetchResourceByUrl(ctx.input.resourceUrl);
      let e = result?.data?.[0] || result?.data || result;

      return {
        type: 'event.created',
        id: String(e.event_id || ctx.input.resourceUrl),
        output: {
          eventId: String(e.event_id || ''),
          eventName: e.event_name || '',
          startDate: e.start_date || undefined,
          dueDate: e.due_date || undefined,
          projectId: e.project_id ? String(e.project_id) : undefined,
          userId: e.user_id ? String(e.user_id) : undefined,
          dateCreated: e.date_created || undefined
        }
      };
    }
  })
  .build();
