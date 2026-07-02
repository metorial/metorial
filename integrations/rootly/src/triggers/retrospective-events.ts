import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_RETROSPECTIVE_EVENT_TYPES = [
  'incident_post_mortem.created',
  'incident_post_mortem.updated',
  'incident_post_mortem.published',
  'incident_post_mortem.deleted'
] as const;

export let retrospectiveEvents = SlateTrigger.create(spec, {
  name: 'Retrospective Events',
  key: 'retrospective_events',
  description:
    'Triggers when retrospectives (post-mortems) are created, updated, published, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The retrospective event type'),
      eventId: z.string().describe('Unique event identifier'),
      retrospective: z
        .record(z.string(), z.any())
        .describe('Retrospective data from webhook payload')
    })
  )
  .output(
    z.object({
      retrospectiveId: z.string().describe('Retrospective ID'),
      incidentId: z.string().optional().describe('Related incident ID'),
      title: z.string().optional().describe('Retrospective title'),
      status: z.string().optional().describe('Retrospective status'),
      createdAt: z.string().optional().describe('When the retrospective was created'),
      updatedAt: z.string().optional().describe('When the retrospective was last updated'),
      publishedAt: z.string().optional().describe('When the retrospective was published')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhookEndpoint({
        name: `Slates Retrospective Events`,
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...ALL_RETROSPECTIVE_EVENT_TYPES],
        enabled: true
      });

      let endpoint = Array.isArray(result.data) ? result.data[0] : result.data;

      return {
        registrationDetails: {
          webhookEndpointId: endpoint!.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.type || body?.event_type || 'incident_post_mortem.updated';
      let retroData = body?.data?.attributes || body?.data || body;
      let retroId = body?.data?.id || retroData?.id || '';

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: `${eventType}-${retroId}-${Date.now()}`,
            retrospective: retroData as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let retro = ctx.input.retrospective as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          retrospectiveId: String(retro.id ?? ''),
          incidentId: retro.incident_id as string | undefined,
          title: retro.title as string | undefined,
          status: retro.status as string | undefined,
          createdAt: retro.created_at as string | undefined,
          updatedAt: retro.updated_at as string | undefined,
          publishedAt: retro.published_at as string | undefined
        }
      };
    }
  })
  .build();
