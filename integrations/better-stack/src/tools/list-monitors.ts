import { SlateTool } from 'slates';
import { z } from 'zod';
import { type ApiResource, nextUrlSchema, pausedState, teamNameSchema } from '../lib/api';
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
  description: `List uptime monitors with status and configuration details. Name and URL filters are applied by the provider. Monitor type, paused state and group filters are applied to each returned page; follow nextUrl to inspect every page.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamName: teamNameSchema,
      nextUrl: nextUrlSchema,
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (default: 50, max: 250)'),
      pronounceableName: z.string().optional().describe('Filter by pronounceable name'),
      url: z.string().optional().describe('Filter by monitored URL'),
      monitorType: z
        .string()
        .optional()
        .describe(
          'Filter this returned page by monitor type (e.g., status, keyword, ping, tcp)'
        ),
      paused: z.boolean().optional().describe('Filter this returned page by paused state'),
      monitorGroupId: z
        .string()
        .optional()
        .describe('Filter this returned page by monitor group ID')
    })
  )
  .output(
    z.object({
      monitors: z.array(monitorSchema).describe('List of monitors'),
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let result = await client.listMonitors({
      nextUrl: ctx.input.nextUrl,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      pronounceableName: ctx.input.pronounceableName,
      url: ctx.input.url
    });

    let monitors = result.data
      .filter(
        item =>
          (ctx.input.monitorType === undefined ||
            item.attributes.monitor_type === ctx.input.monitorType) &&
          (ctx.input.paused === undefined ||
            pausedState(item.attributes) === ctx.input.paused) &&
          (ctx.input.monitorGroupId === undefined ||
            String(item.attributes.monitor_group_id) === ctx.input.monitorGroupId)
      )
      .map((item: ApiResource) => {
        let attrs = item.attributes;
        return {
          monitorId: String(item.id),
          name: attrs.pronounceable_name || attrs.name || null,
          url: attrs.url || null,
          monitorType: attrs.monitor_type || null,
          status: attrs.status || null,
          paused: pausedState(attrs),
          pronounceableName: attrs.pronounceable_name || null,
          checkFrequency: attrs.check_frequency ?? null,
          lastCheckedAt: attrs.last_checked_at || null,
          createdAt: attrs.created_at || null,
          updatedAt: attrs.updated_at || null
        };
      });

    let hasMore = !!result.pagination?.next;

    return {
      output: { monitors, hasMore, nextUrl: result.pagination?.next ?? undefined },
      message: `Found **${monitors.length}** monitor(s)${hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
