import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let incidentUpdateSchema = z.object({
  updateId: z.string().describe('Unique identifier of the update'),
  status: z.string().describe('Status at the time of the update'),
  body: z.string().optional().nullable().describe('Update message body'),
  createdAt: z.string().optional().describe('Timestamp of the update')
});

let incidentSchema = z.object({
  incidentId: z.string().describe('Unique identifier of the incident'),
  name: z.string().describe('Title of the incident'),
  status: z
    .string()
    .describe(
      'Current status: investigating, identified, monitoring, resolved, scheduled, in_progress, verifying, completed'
    ),
  impact: z.string().optional().describe('Impact level: none, minor, major, critical'),
  shortlink: z.string().optional().nullable().describe('Short URL for the incident'),
  scheduledFor: z
    .string()
    .optional()
    .nullable()
    .describe('Scheduled start time (for scheduled incidents)'),
  scheduledUntil: z
    .string()
    .optional()
    .nullable()
    .describe('Scheduled end time (for scheduled incidents)'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  resolvedAt: z.string().optional().nullable().describe('Resolution timestamp'),
  incidentUpdates: z
    .array(incidentUpdateSchema)
    .optional()
    .describe('History of status updates')
});

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List incidents on the status page with optional filtering. Can retrieve all incidents, only unresolved, only scheduled, or search by keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'unresolved', 'scheduled'])
        .optional()
        .describe('Filter incidents by category. Defaults to "all".'),
      query: z.string().optional().describe('Search query to filter incidents by name'),
      limit: z.number().optional().describe('Maximum number of incidents to return per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      incidents: z.array(incidentSchema).describe('List of incidents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    let raw: any[];
    let filter = ctx.input.filter || 'all';

    if (filter === 'unresolved') {
      raw = await client.listUnresolvedIncidents();
    } else if (filter === 'scheduled') {
      raw = await client.listScheduledIncidents();
    } else {
      raw = await client.listIncidents({
        query: ctx.input.query,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let incidents = raw.map((i: any) => ({
      incidentId: i.id,
      name: i.name,
      status: i.status,
      impact: i.impact,
      shortlink: i.shortlink,
      scheduledFor: i.scheduled_for,
      scheduledUntil: i.scheduled_until,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      resolvedAt: i.resolved_at,
      incidentUpdates: (i.incident_updates || []).map((u: any) => ({
        updateId: u.id,
        status: u.status,
        body: u.body,
        createdAt: u.created_at
      }))
    }));

    return {
      output: { incidents },
      message: `Found **${incidents.length}** incident(s) (filter: ${filter}).`
    };
  })
  .build();
