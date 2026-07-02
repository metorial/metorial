import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMonitor = SlateTool.create(spec, {
  name: 'Get Monitor',
  key: 'get_monitor',
  description: `Get full details for a Datadog monitor by ID, including its query, options, tags, and current state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      monitorId: z.number().describe('ID of the monitor to retrieve')
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('ID of the monitor'),
      name: z.string().describe('Monitor name'),
      type: z.string().describe('Monitor type'),
      query: z.string().describe('Monitor query'),
      overallState: z.string().optional().describe('Current state of the monitor'),
      message: z.string().optional().describe('Notification message'),
      tags: z.array(z.string()).optional().describe('Monitor tags'),
      priority: z.number().optional().describe('Monitor priority'),
      options: z.any().optional().describe('Raw Datadog monitor options'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modification timestamp'),
      creatorName: z.string().optional().describe('Monitor creator name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let monitor = await client.getMonitor(ctx.input.monitorId);

    return {
      output: {
        monitorId: monitor.id || ctx.input.monitorId,
        name: monitor.name,
        type: monitor.type,
        query: monitor.query,
        overallState: monitor.overall_state,
        message: monitor.message,
        tags: monitor.tags,
        priority: monitor.priority,
        options: monitor.options,
        created: monitor.created,
        modified: monitor.modified,
        creatorName: monitor.creator?.name
      },
      message: `Retrieved monitor **${monitor.name}** (ID: ${monitor.id || ctx.input.monitorId})`
    };
  })
  .build();
