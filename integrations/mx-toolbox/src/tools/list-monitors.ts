import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMonitors = SlateTool.create(spec, {
  name: 'List Monitors',
  key: 'list_monitors',
  description: `Retrieve the current status of all subscribed monitors. Returns each monitor's UID, action type, last transition time, last check time, reputation score, and any failing or warning conditions. Optionally filter monitors by tag.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z
        .string()
        .optional()
        .describe('Filter monitors by tag name (e.g., "blacklist", "dns")')
    })
  )
  .output(
    z.object({
      monitors: z
        .array(
          z.object({
            monitorUid: z.string().describe('Unique identifier of the monitor'),
            actionString: z
              .string()
              .describe('Monitor type and target (e.g., "blacklist:example.com")'),
            lastTransition: z.string().describe('Timestamp of the last status change'),
            lastChecked: z.string().describe('Timestamp of the most recent check'),
            mxRep: z.string().describe('MX reputation score'),
            failing: z.array(z.string()).describe('List of currently failing checks'),
            warnings: z.array(z.string()).describe('List of current warnings')
          })
        )
        .describe('List of monitors and their current status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let monitors = await client.getMonitors(ctx.input.tag);

    let failingCount = monitors.filter(m => m.failing.length > 0).length;
    let tagInfo = ctx.input.tag ? ` (filtered by tag: **${ctx.input.tag}**)` : '';

    return {
      output: { monitors },
      message: `Found **${monitors.length}** monitors${tagInfo}. ${failingCount > 0 ? `**${failingCount}** with active failures.` : 'All monitors are healthy.'}`
    };
  })
  .build();
