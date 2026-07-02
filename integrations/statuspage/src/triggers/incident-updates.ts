import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let incidentUpdates = SlateTrigger.create(spec, {
  name: 'Incident Updates',
  key: 'incident_updates',
  description:
    'Triggers when incidents are created, updated, or resolved on the status page. Polls for new and changed incidents periodically.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'resolved'])
        .describe('Type of change detected'),
      incidentId: z.string().describe('ID of the incident'),
      latestUpdateId: z.string().describe('ID of the latest incident update entry'),
      incident: z.any().describe('Full incident data from the API')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Unique identifier of the incident'),
      name: z.string().describe('Title of the incident'),
      status: z.string().describe('Current status of the incident'),
      impact: z.string().optional().describe('Impact level: none, minor, major, critical'),
      shortlink: z.string().optional().nullable().describe('Short URL for the incident'),
      latestUpdateBody: z
        .string()
        .optional()
        .nullable()
        .describe('Body text of the latest update'),
      latestUpdateStatus: z.string().optional().describe('Status of the latest update'),
      createdAt: z.string().optional().describe('Incident creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      resolvedAt: z.string().optional().nullable().describe('Resolution timestamp'),
      affectedComponents: z
        .array(
          z.object({
            componentId: z.string().describe('ID of the affected component'),
            name: z.string().describe('Name of the component'),
            status: z.string().describe('Component status during this incident')
          })
        )
        .optional()
        .describe('Components affected by this incident')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
      let previousState = ctx.state as {
        knownUpdateIds?: Record<string, string>;
        lastPollTime?: string;
      } | null;
      let knownUpdateIds: Record<string, string> = previousState?.knownUpdateIds || {};

      let incidents = await client.listIncidents({ limit: 50 });
      let inputs: Array<{
        eventType: 'created' | 'updated' | 'resolved';
        incidentId: string;
        latestUpdateId: string;
        incident: any;
      }> = [];

      for (let incident of incidents) {
        let updates = incident.incident_updates || [];
        let latestUpdate = updates[0];
        let latestUpdateId = latestUpdate?.id || incident.id;
        let previousUpdateId = knownUpdateIds[incident.id];

        if (!previousUpdateId) {
          if (!previousState?.lastPollTime) {
            knownUpdateIds[incident.id] = latestUpdateId;
            continue;
          }
          inputs.push({
            eventType: 'created',
            incidentId: incident.id,
            latestUpdateId,
            incident
          });
        } else if (previousUpdateId !== latestUpdateId) {
          inputs.push({
            eventType:
              incident.status === 'resolved' || incident.status === 'completed'
                ? 'resolved'
                : 'updated',
            incidentId: incident.id,
            latestUpdateId,
            incident
          });
        }

        knownUpdateIds[incident.id] = latestUpdateId;
      }

      return {
        inputs,
        updatedState: {
          knownUpdateIds,
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let incident = ctx.input.incident;
      let updates = incident.incident_updates || [];
      let latestUpdate = updates[0];

      return {
        type: `incident.${ctx.input.eventType}`,
        id: ctx.input.latestUpdateId,
        output: {
          incidentId: incident.id,
          name: incident.name,
          status: incident.status,
          impact: incident.impact,
          shortlink: incident.shortlink,
          latestUpdateBody: latestUpdate?.body,
          latestUpdateStatus: latestUpdate?.status,
          createdAt: incident.created_at,
          updatedAt: incident.updated_at,
          resolvedAt: incident.resolved_at,
          affectedComponents: (incident.components || []).map((c: any) => ({
            componentId: c.id,
            name: c.name,
            status: c.status
          }))
        }
      };
    }
  })
  .build();
