import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let monitorSchema = z.object({
  monitorId: z.string().describe('Unique monitor ID'),
  name: z.string().nullable().describe('Human-readable name'),
  url: z.string().nullable().describe('URL or IP being monitored'),
  monitorType: z.string().nullable().describe('Type of monitor (e.g., status, keyword, ping)'),
  status: z.string().nullable().describe('Current status of the monitor'),
  paused: z.boolean().nullable().describe('Whether the monitor is paused'),
  pronounceableName: z.string().nullable().describe('Auto-generated pronounceable name'),
  checkFrequency: z.number().nullable().describe('Check frequency in seconds'),
  lastCheckedAt: z.string().nullable().describe('Timestamp of last check'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let listMonitors = SlateTool.create(spec, {
  name: 'List Monitors',
  key: 'list_monitors',
  description: `List uptime monitors in your Better Stack account. Supports filtering by name, URL, monitor type, paused state, and monitor group. Returns paginated results with monitor status and configuration details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (default: 20, max: 50)'),
      pronounceableName: z.string().optional().describe('Filter by pronounceable name'),
      url: z.string().optional().describe('Filter by monitored URL'),
      monitorType: z
        .string()
        .optional()
        .describe(
          'Filter by monitor type (e.g., status, keyword, ping, tcp, udp, smtp, pop, imap)'
        ),
      paused: z.boolean().optional().describe('Filter by paused state'),
      monitorGroupId: z.string().optional().describe('Filter by monitor group ID')
    })
  )
  .output(
    z.object({
      monitors: z.array(monitorSchema).describe('List of monitors'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let result = await client.listMonitors({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      pronounceableName: ctx.input.pronounceableName,
      url: ctx.input.url,
      monitorType: ctx.input.monitorType,
      paused: ctx.input.paused,
      monitorGroupId: ctx.input.monitorGroupId ? Number(ctx.input.monitorGroupId) : undefined
    });

    let monitors = (result.data || []).map((item: any) => {
      let attrs = item.attributes || item;
      return {
        monitorId: String(item.id),
        name: attrs.pronounceable_name || attrs.name || null,
        url: attrs.url || null,
        monitorType: attrs.monitor_type || null,
        status: attrs.status || null,
        paused: attrs.paused ?? null,
        pronounceableName: attrs.pronounceable_name || null,
        checkFrequency: attrs.check_frequency ?? null,
        lastCheckedAt: attrs.last_checked_at || null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    });

    let hasMore = !!result.pagination?.next;

    return {
      output: { monitors, hasMore },
      message: `Found **${monitors.length}** monitor(s)${hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
