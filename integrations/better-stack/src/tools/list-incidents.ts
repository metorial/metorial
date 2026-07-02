import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let incidentSchema = z.object({
  incidentId: z.string().describe('Unique incident ID'),
  name: z.string().nullable().describe('Incident name/cause'),
  url: z.string().nullable().describe('URL affected by the incident'),
  cause: z.string().nullable().describe('Root cause of the incident'),
  status: z.string().nullable().describe('Current incident status'),
  startedAt: z.string().nullable().describe('When the incident started'),
  resolvedAt: z.string().nullable().describe('When the incident was resolved'),
  acknowledgedAt: z.string().nullable().describe('When the incident was acknowledged'),
  acknowledgedBy: z.string().nullable().describe('Who acknowledged the incident'),
  resolvedBy: z.string().nullable().describe('Who resolved the incident'),
  callUrl: z.string().nullable().describe('URL for the incident call'),
  screenshotUrl: z.string().nullable().describe('Screenshot URL')
});

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List incidents in your Better Stack account. Filter by monitor, heartbeat, date range, resolution status, and acknowledgment status. Returns paginated results with incident details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 50)'),
      from: z.string().optional().describe('Start date filter (ISO 8601)'),
      to: z.string().optional().describe('End date filter (ISO 8601)'),
      monitorId: z.string().optional().describe('Filter by monitor ID'),
      heartbeatId: z.string().optional().describe('Filter by heartbeat ID'),
      resolved: z.boolean().optional().describe('Filter by resolved status'),
      acknowledged: z.boolean().optional().describe('Filter by acknowledged status')
    })
  )
  .output(
    z.object({
      incidents: z.array(incidentSchema).describe('List of incidents'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let result = await client.listIncidents({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      from: ctx.input.from,
      to: ctx.input.to,
      monitorId: ctx.input.monitorId,
      heartbeatId: ctx.input.heartbeatId,
      resolved: ctx.input.resolved,
      acknowledged: ctx.input.acknowledged
    });

    let incidents = (result.data || []).map((item: any) => {
      let attrs = item.attributes || item;
      return {
        incidentId: String(item.id),
        name: attrs.name || null,
        url: attrs.url || null,
        cause: attrs.cause || null,
        status: attrs.status || null,
        startedAt: attrs.started_at || null,
        resolvedAt: attrs.resolved_at || null,
        acknowledgedAt: attrs.acknowledged_at || null,
        acknowledgedBy: attrs.acknowledged_by || null,
        resolvedBy: attrs.resolved_by || null,
        callUrl: attrs.call_url || null,
        screenshotUrl: attrs.screenshot_url || null
      };
    });

    let hasMore = !!result.pagination?.next;

    return {
      output: { incidents, hasMore },
      message: `Found **${incidents.length}** incident(s)${hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
