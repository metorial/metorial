import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { monitorSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listMonitors = SlateTool.create(spec, {
  name: 'List Monitors',
  key: 'list_monitors',
  description: `Retrieve subscribed monitors, their UIDs, current checks, reputation scores, history URLs, and tags. Optionally combine tag, command, and target filters.`,
  constraints: ['Monitor queries require an API plan with monitor access.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z
        .string()
        .optional()
        .describe('Filter monitors by tag name (e.g., "production", "staging")'),
      command: z
        .string()
        .optional()
        .describe('Filter by lookup type, such as mx or blacklist'),
      name: z.string().optional().describe('Filter by monitored domain name or IP address')
    })
  )
  .output(
    z.object({
      monitors: z.array(monitorSchema).describe('List of monitors and their current status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let monitors = await client.getMonitors(ctx.input.tag, ctx.input.command, ctx.input.name);

    let failingCount = monitors.filter(m => m.failing.length > 0).length;
    let warningCount = monitors.filter(m => m.warnings.length > 0).length;
    let tagInfo = ctx.input.tag ? ` (filtered by tag: **${ctx.input.tag}**)` : '';

    return {
      output: { monitors },
      message: `Found **${monitors.length}** monitors${tagInfo}. **${failingCount}** with active failures and **${warningCount}** with warnings.`
    };
  })
  .build();
