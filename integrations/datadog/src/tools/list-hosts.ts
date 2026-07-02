import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listHosts = SlateTool.create(spec, {
  name: 'List Hosts',
  key: 'list_hosts',
  description: `List infrastructure hosts monitored by Datadog. Filter by name and sort by various fields. Returns host details including apps, tags, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Filter hosts by name or tag, e.g. "web" or "env:production"'),
      sortField: z
        .string()
        .optional()
        .describe('Sort field: "cpu", "iowait", "load", "apps", "name", "status"'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      count: z.number().optional().describe('Maximum number of hosts to return (max 1000)'),
      start: z.number().optional().describe('Offset for pagination'),
      from: z
        .number()
        .optional()
        .describe('Only return hosts that have reported in the last N seconds')
    })
  )
  .output(
    z.object({
      hosts: z
        .array(
          z.object({
            name: z.string().optional(),
            hostId: z.number().optional(),
            aliases: z.array(z.string()).optional(),
            apps: z.array(z.string()).optional(),
            isMuted: z.boolean().optional(),
            lastReportedTime: z.number().optional(),
            up: z.boolean().optional(),
            tagsBySource: z.any().optional()
          })
        )
        .describe('List of infrastructure hosts'),
      totalReturned: z.number().optional().describe('Number of hosts returned'),
      totalMatching: z.number().optional().describe('Total number of matching hosts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listHosts(ctx.input);

    let hosts = (result.host_list || []).map((h: any) => ({
      name: h.name,
      hostId: h.id,
      aliases: h.aliases,
      apps: h.apps,
      isMuted: h.is_muted,
      lastReportedTime: h.last_reported_time,
      up: h.up,
      tagsBySource: h.tags_by_source
    }));

    return {
      output: {
        hosts,
        totalReturned: result.total_returned,
        totalMatching: result.total_matching
      },
      message: `Found **${hosts.length}** hosts (${result.total_matching || hosts.length} total matching)`
    };
  })
  .build();
