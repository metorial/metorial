import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_SCHEDULED_INCIDENT_EVENT_TYPES = [
  'incident.scheduled.created',
  'incident.scheduled.updated',
  'incident.scheduled.in_progress',
  'incident.scheduled.completed',
  'incident.scheduled.deleted'
] as const;

export let scheduledIncidentEvents = SlateTrigger.create(spec, {
  name: 'Scheduled Incident Events',
  key: 'scheduled_incident_events',
  description:
    'Triggers when scheduled maintenance incidents are created, updated, started, completed, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The scheduled incident event type'),
      eventId: z.string().describe('Unique event identifier'),
      incident: z
        .record(z.string(), z.any())
        .describe('Scheduled incident data from webhook payload')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      title: z.string().optional().describe('Incident title'),
      slug: z.string().optional().describe('Incident slug'),
      status: z.string().optional().describe('Incident status'),
      summary: z.string().optional().describe('Incident summary'),
      url: z.string().optional().describe('Incident URL'),
      scheduledFor: z.string().optional().describe('Scheduled start time'),
      scheduledUntil: z.string().optional().describe('Scheduled end time'),
      services: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Affected services'),
      createdAt: z.string().optional().describe('When the incident was created'),
      updatedAt: z.string().optional().describe('When the incident was last updated')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhookEndpoint({
        name: `Slates Scheduled Incident Events`,
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...ALL_SCHEDULED_INCIDENT_EVENT_TYPES],
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

      let eventType = body?.type || body?.event_type || 'incident.scheduled.updated';
      let incidentData = body?.data?.attributes || body?.data || body;
      let incidentId = body?.data?.id || incidentData?.id || '';

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: `${eventType}-${incidentId}-${Date.now()}`,
            incident: incidentData as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let incident = ctx.input.incident as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          incidentId: String(incident.id ?? ''),
          title: incident.title as string | undefined,
          slug: incident.slug as string | undefined,
          status: incident.status as string | undefined,
          summary: incident.summary as string | undefined,
          url: incident.url as string | undefined,
          scheduledFor: incident.scheduled_for as string | undefined,
          scheduledUntil: incident.scheduled_until as string | undefined,
          services: incident.services as Record<string, any>[] | undefined,
          createdAt: incident.created_at as string | undefined,
          updatedAt: incident.updated_at as string | undefined
        }
      };
    }
  })
  .build();
