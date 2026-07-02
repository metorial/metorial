import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description: `Retrieve detailed information about a specific incident including its full update history, affected components, and current status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('ID of the incident to retrieve')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Unique identifier of the incident'),
      name: z.string().describe('Title of the incident'),
      status: z.string().describe('Current status'),
      impact: z.string().optional().describe('Impact level'),
      shortlink: z.string().optional().nullable().describe('Short URL for the incident'),
      scheduledFor: z.string().optional().nullable().describe('Scheduled start time'),
      scheduledUntil: z.string().optional().nullable().describe('Scheduled end time'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      resolvedAt: z.string().optional().nullable().describe('Resolution timestamp'),
      incidentUpdates: z
        .array(
          z.object({
            updateId: z.string().describe('Unique identifier of the update'),
            status: z.string().describe('Status at the time of update'),
            body: z.string().optional().nullable().describe('Update message body'),
            createdAt: z.string().optional().describe('Timestamp of the update'),
            updatedAt: z.string().optional().describe('Timestamp of the last modification')
          })
        )
        .optional()
        .describe('Timeline of incident updates'),
      components: z
        .array(
          z.object({
            componentId: z.string().describe('ID of the affected component'),
            name: z.string().describe('Name of the component'),
            status: z.string().describe('Status of the component')
          })
        )
        .optional()
        .describe('Components affected by this incident')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
    let incident = await client.getIncident(ctx.input.incidentId);

    return {
      output: {
        incidentId: incident.id,
        name: incident.name,
        status: incident.status,
        impact: incident.impact,
        shortlink: incident.shortlink,
        scheduledFor: incident.scheduled_for,
        scheduledUntil: incident.scheduled_until,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at,
        resolvedAt: incident.resolved_at,
        incidentUpdates: (incident.incident_updates || []).map((u: any) => ({
          updateId: u.id,
          status: u.status,
          body: u.body,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        })),
        components: (incident.components || []).map((c: any) => ({
          componentId: c.id,
          name: c.name,
          status: c.status
        }))
      },
      message: `Retrieved incident **${incident.name}** (status: \`${incident.status}\`, impact: ${incident.impact || 'none'}).`
    };
  })
  .build();
