import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let incidentEvents = SlateTrigger.create(spec, {
  name: 'Incident Events',
  key: 'incident_events',
  description:
    'Triggered when incidents are created, updated, or have their status changed. Covers both public and private incidents.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      webhookId: z.string().describe('Unique ID for this webhook delivery'),
      incidentId: z.string().describe('ID of the incident'),
      isPrivate: z.boolean().describe('Whether this is a private incident'),
      incident: z
        .any()
        .optional()
        .describe('Full incident payload (null for private incidents)')
    })
  )
  .output(
    z.object({
      incidentId: z.string(),
      reference: z.string().optional(),
      name: z.string().optional(),
      summary: z.string().optional(),
      visibility: z.string().optional(),
      mode: z.string().optional(),
      severity: z.any().optional(),
      status: z.any().optional(),
      incidentType: z.any().optional(),
      permalink: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = (body.event_type as string) || '';

      let isIncidentEvent =
        eventType.includes('incident_created') ||
        eventType.includes('incident_updated') ||
        eventType.includes('incident_status_updated');

      if (!isIncidentEvent) {
        return { inputs: [] };
      }

      let isPrivate = eventType.startsWith('private_incident.');

      let incidentData = isPrivate ? body.private_incident : body.public_incident;

      let incidentId = incidentData?.id || '';

      return {
        inputs: [
          {
            eventType,
            webhookId: body.id || crypto.randomUUID(),
            incidentId,
            isPrivate,
            incident: isPrivate ? undefined : incidentData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let inc = input.incident;

      // For private incidents, attempt to fetch full details
      if (input.isPrivate && !inc) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let result = await client.getIncident(input.incidentId);
          inc = result.incident;
        } catch {
          // API key may not have private incident access
        }
      }

      let type = 'incident.updated';
      if (input.eventType.includes('incident_created')) {
        type = 'incident.created';
      } else if (input.eventType.includes('incident_status_updated')) {
        type = 'incident.status_updated';
      }

      return {
        type,
        id: input.webhookId,
        output: {
          incidentId: input.incidentId,
          reference: inc?.reference || undefined,
          name: inc?.name || undefined,
          summary: inc?.summary || undefined,
          visibility: inc?.visibility || (input.isPrivate ? 'private' : 'public'),
          mode: inc?.mode || undefined,
          severity: inc?.severity || undefined,
          status: inc?.incident_status || undefined,
          incidentType: inc?.incident_type || undefined,
          permalink: inc?.permalink || undefined,
          createdAt: inc?.created_at || undefined,
          updatedAt: inc?.updated_at || undefined
        }
      };
    }
  })
  .build();
