import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List and filter incidents in your incident.io account. Supports filtering by status, severity, status category, incident type, mode, and creation date. Returns paginated results sorted by creation time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of results per page (max 250, default 25)'),
      after: z
        .string()
        .optional()
        .describe(
          'Cursor for pagination; use the value from the previous response to get the next page'
        ),
      sortBy: z
        .enum(['created_at_newest_first', 'created_at_oldest_first'])
        .optional()
        .describe('Sort order for results'),
      statusIds: z.array(z.string()).optional().describe('Filter by incident status IDs'),
      severityIds: z.array(z.string()).optional().describe('Filter by severity IDs'),
      statusCategory: z
        .array(
          z.enum(['triage', 'declined', 'merged', 'canceled', 'live', 'learning', 'closed'])
        )
        .optional()
        .describe('Filter by status category'),
      incidentTypeIds: z.array(z.string()).optional().describe('Filter by incident type IDs'),
      mode: z
        .array(z.enum(['standard', 'retrospective', 'test', 'tutorial']))
        .optional()
        .describe('Filter by incident mode'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return incidents created at or after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return incidents created at or before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      incidents: z.array(
        z.object({
          incidentId: z.string(),
          reference: z.string(),
          name: z.string(),
          summary: z.string().optional(),
          visibility: z.string(),
          mode: z.string(),
          severity: z.any().optional(),
          status: z.any().optional(),
          incidentType: z.any().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
          permalink: z.string().optional()
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listIncidents({
      pageSize: ctx.input.pageSize,
      after: ctx.input.after,
      sortBy: ctx.input.sortBy,
      status: ctx.input.statusIds,
      severity: ctx.input.severityIds,
      statusCategory: ctx.input.statusCategory,
      incidentType: ctx.input.incidentTypeIds,
      mode: ctx.input.mode,
      createdAtGte: ctx.input.createdAfter,
      createdAtLte: ctx.input.createdBefore
    });

    let incidents = result.incidents.map((inc: any) => ({
      incidentId: inc.id,
      reference: inc.reference,
      name: inc.name,
      summary: inc.summary || undefined,
      visibility: inc.visibility,
      mode: inc.mode,
      severity: inc.severity || undefined,
      status: inc.incident_status || undefined,
      incidentType: inc.incident_type || undefined,
      createdAt: inc.created_at,
      updatedAt: inc.updated_at,
      permalink: inc.permalink || undefined
    }));

    return {
      output: {
        incidents,
        nextCursor: result.pagination_meta?.after || undefined,
        totalCount: result.pagination_meta?.total_record_count || undefined
      },
      message: `Found **${incidents.length}** incident(s).${result.pagination_meta?.after ? ' More results available.' : ''}`
    };
  })
  .build();
