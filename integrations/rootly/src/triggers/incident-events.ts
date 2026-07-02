import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_INCIDENT_EVENT_TYPES = [
  'incident.created',
  'incident.updated',
  'incident.mitigated',
  'incident.resolved',
  'incident.cancelled',
  'incident.deleted'
] as const;

export let incidentEvents = SlateTrigger.create(spec, {
  name: 'Incident Events',
  key: 'incident_events',
  description:
    'Triggers when incidents are created, updated, mitigated, resolved, cancelled, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('The incident event type'),
      eventId: z.string().describe('Unique event identifier'),
      incident: z.record(z.string(), z.any()).describe('Incident data from webhook payload')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      title: z.string().optional().describe('Incident title'),
      slug: z.string().optional().describe('Incident slug'),
      status: z.string().optional().describe('Incident status'),
      severity: z.record(z.string(), z.any()).optional().describe('Severity details'),
      summary: z.string().optional().describe('Incident summary'),
      url: z.string().optional().describe('Incident URL'),
      kind: z.string().optional().describe('Incident kind'),
      isPrivate: z.boolean().optional().describe('Whether the incident is private'),
      services: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Affected services'),
      environments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Affected environments'),
      incidentTypes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Incident types'),
      labels: z.record(z.string(), z.any()).optional().describe('Incident labels'),
      createdAt: z.string().optional().describe('When the incident was created'),
      updatedAt: z.string().optional().describe('When the incident was last updated'),
      startedAt: z.string().optional().describe('When the incident started'),
      mitigatedAt: z.string().optional().describe('When the incident was mitigated'),
      resolvedAt: z.string().optional().describe('When the incident was resolved')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhookEndpoint({
        name: `Slates Incident Events`,
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...ALL_INCIDENT_EVENT_TYPES],
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

      let eventType = body?.type || body?.event_type || 'incident.updated';
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
          severity: incident.severity as Record<string, any> | undefined,
          summary: incident.summary as string | undefined,
          url: incident.url as string | undefined,
          kind: incident.kind as string | undefined,
          isPrivate: incident.private as boolean | undefined,
          services: incident.services as Record<string, any>[] | undefined,
          environments: incident.environments as Record<string, any>[] | undefined,
          incidentTypes: incident.incident_types as Record<string, any>[] | undefined,
          labels: incident.labels as Record<string, any> | undefined,
          createdAt: incident.created_at as string | undefined,
          updatedAt: incident.updated_at as string | undefined,
          startedAt: incident.started_at as string | undefined,
          mitigatedAt: incident.mitigated_at as string | undefined,
          resolvedAt: incident.resolved_at as string | undefined
        }
      };
    }
  })
  .build();
