import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { monitorSchema, monitorUidSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getMonitor = SlateTool.create(spec, {
  name: 'Get Monitor',
  key: 'get_monitor',
  description:
    'Retrieve current status, checks, history URL, and tags for one monitor. Call list_monitors to discover monitor UIDs.',
  constraints: ['Monitor queries require an API plan with monitor access.'],
  tags: { readOnly: true }
})
  .input(z.object({ monitorUid: monitorUidSchema }))
  .output(
    z.object({
      monitor: monitorSchema
        .nullable()
        .describe('Matching monitor, or null when no monitor matches the UID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let monitor = await client.getMonitor(ctx.input.monitorUid);
    return {
      output: { monitor },
      message: monitor
        ? `Retrieved monitor **${monitor.monitorUid}** with ${monitor.failing.length} failing checks and ${monitor.warnings.length} warnings.`
        : `No monitor matches UID **${ctx.input.monitorUid}**.`
    };
  })
  .build();
