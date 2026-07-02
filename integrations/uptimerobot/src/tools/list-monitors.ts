import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let monitorSchema = z.object({
  monitorId: z.number().describe('Unique monitor ID'),
  friendlyName: z.string().describe('Display name of the monitor'),
  url: z.string().describe('URL or IP being monitored'),
  type: z.number().describe('Monitor type: 1=HTTP(s), 2=Keyword, 3=Ping, 4=Port, 5=Heartbeat'),
  status: z
    .number()
    .describe('Current status: 0=Paused, 1=Not checked yet, 2=Up, 8=Seems down, 9=Down'),
  interval: z.number().describe('Check interval in seconds'),
  uptimeRatio: z
    .string()
    .optional()
    .describe('Uptime ratio percentages for requested periods'),
  ssl: z
    .object({
      brand: z.string().optional(),
      product: z.string().nullable().optional(),
      expires: z.number().optional()
    })
    .optional()
    .describe('SSL certificate information')
});

export let listMonitors = SlateTool.create(spec, {
  name: 'List Monitors',
  key: 'list_monitors',
  description: `Retrieve monitors from your UptimeRobot account with optional filtering by type, status, or search term. Returns monitor details including current status, URL, type, and check interval. Supports pagination for large monitor lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      monitorIds: z.array(z.number()).optional().describe('Filter to specific monitor IDs'),
      types: z
        .array(z.enum(['http', 'keyword', 'ping', 'port', 'heartbeat']))
        .optional()
        .describe('Filter by monitor types'),
      statuses: z
        .array(z.enum(['paused', 'not_checked', 'up', 'seems_down', 'down']))
        .optional()
        .describe('Filter by current statuses'),
      search: z.string().optional().describe('Search in URL and friendly name'),
      includeUptimeRatio: z
        .boolean()
        .optional()
        .describe('Include uptime ratio for the last 1, 7, and 30 days'),
      includeSsl: z.boolean().optional().describe('Include SSL certificate info'),
      offset: z.number().optional().describe('Pagination offset (default 0)'),
      limit: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      monitors: z.array(monitorSchema),
      total: z.number().describe('Total number of monitors matching the filter'),
      offset: z.number().describe('Current pagination offset'),
      limit: z.number().describe('Current pagination limit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let typeMap: Record<string, number> = {
      http: 1,
      keyword: 2,
      ping: 3,
      port: 4,
      heartbeat: 5
    };
    let statusMap: Record<string, number> = {
      paused: 0,
      not_checked: 1,
      up: 2,
      seems_down: 8,
      down: 9
    };

    let result = await client.getMonitors({
      monitors: ctx.input.monitorIds?.join('-'),
      types: ctx.input.types?.map(t => String(typeMap[t])).join('-'),
      statuses: ctx.input.statuses?.map(s => String(statusMap[s])).join('-'),
      search: ctx.input.search,
      customUptimeRatios: ctx.input.includeUptimeRatio ? '1-7-30' : undefined,
      ssl: ctx.input.includeSsl ? 1 : undefined,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let monitors = result.monitors.map((m: any) => ({
      monitorId: m.id,
      friendlyName: m.friendly_name,
      url: m.url,
      type: m.type,
      status: m.status,
      interval: m.interval,
      ...(m.custom_uptime_ratio && { uptimeRatio: m.custom_uptime_ratio }),
      ...(m.ssl && {
        ssl: { brand: m.ssl.brand, product: m.ssl.product, expires: m.ssl.expires }
      })
    }));

    let total = result.pagination?.total ?? monitors.length;
    let offset = result.pagination?.offset ?? 0;
    let limit = result.pagination?.limit ?? 50;

    return {
      output: { monitors, total, offset, limit },
      message: `Found **${total}** monitor(s). Returned ${monitors.length} starting at offset ${offset}.`
    };
  })
  .build();
