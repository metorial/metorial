import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

let logEntrySchema = z.object({
  timestamp: z.string().describe('ISO 8601 timestamp of the query'),
  domain: z.string().describe('Queried domain name'),
  root: z.string().optional().describe('Root domain'),
  tracker: z.string().optional().describe('Tracker identifier if applicable'),
  encrypted: z.boolean().optional().describe('Whether the query was encrypted'),
  protocol: z.string().optional().describe('DNS protocol used (e.g., "DNS-over-HTTPS")'),
  clientIp: z.string().optional().describe('Client IP address'),
  clientName: z.string().optional().describe('Client name if identified'),
  device: z
    .object({
      deviceId: z.string().optional().describe('Device identifier'),
      name: z.string().optional().describe('Device name'),
      model: z.string().optional().describe('Device model')
    })
    .optional()
    .describe('Device information'),
  status: z.string().describe('Query status (default, blocked, allowed, error)'),
  reasons: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Reasons for blocking if applicable')
});

export let getLogs = SlateTool.create(spec, {
  name: 'Get DNS Logs',
  key: 'get_logs',
  description: `Retrieve DNS query logs for a NextDNS profile. Each log entry includes the timestamp, queried domain, protocol, client IP, device info, query status, and blocking reasons. Supports filtering by date range, device, status, and domain search.`,
  instructions: [
    'Use the cursor from meta.pagination.cursor to paginate through results.',
    'Status filter options: "default", "blocked", "allowed", "error".'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile'),
      from: z
        .string()
        .optional()
        .describe('Start date (ISO 8601, Unix timestamp, or relative like "-1h")'),
      to: z.string().optional().describe('End date'),
      deviceId: z.string().optional().describe('Filter by device ID'),
      status: z
        .enum(['default', 'blocked', 'allowed', 'error'])
        .optional()
        .describe('Filter by query status'),
      search: z.string().optional().describe('Search by domain name'),
      limit: z.number().optional().describe('Number of results per page (10-1000)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      logs: z.array(logEntrySchema).describe('DNS query log entries'),
      cursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let params: Record<string, string | number | boolean | undefined> = {};

    if (ctx.input.from) params.from = ctx.input.from;
    if (ctx.input.to) params.to = ctx.input.to;
    if (ctx.input.deviceId) params.device = ctx.input.deviceId;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;

    let result = await client.getLogs(ctx.input.profileId, params);
    let entries = (result.data || []).map((entry: any) => ({
      timestamp: entry.timestamp,
      domain: entry.domain,
      root: entry.root,
      tracker: entry.tracker,
      encrypted: entry.encrypted,
      protocol: entry.protocol,
      clientIp: entry.clientIp,
      clientName: entry.client,
      device: entry.device
        ? {
            deviceId: entry.device.id,
            name: entry.device.name,
            model: entry.device.model
          }
        : undefined,
      status: entry.status,
      reasons: entry.reasons
    }));

    let cursor = result.meta?.pagination?.cursor || undefined;

    return {
      output: { logs: entries, cursor },
      message: `Retrieved **${entries.length}** log entries for profile \`${ctx.input.profileId}\`.${cursor ? ' More results available with cursor.' : ''}`
    };
  })
  .build();
