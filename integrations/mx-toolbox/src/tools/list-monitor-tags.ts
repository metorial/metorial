import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { monitorTagSchema, monitorUidSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listMonitorTags = SlateTool.create(spec, {
  name: 'List Monitor Tags',
  key: 'list_monitor_tags',
  description:
    'Retrieve tag names, UIDs, visibility, and exclusion settings for a monitor. Call list_monitors to discover monitor UIDs. Use returned names to filter list_monitors by tag.',
  constraints: ['Monitor queries require an API plan with monitor access.'],
  tags: { readOnly: true }
})
  .input(z.object({ monitorUid: monitorUidSchema }))
  .output(z.object({ monitorUid: z.string(), tags: z.array(monitorTagSchema) }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let tags = await client.getMonitorTags(ctx.input.monitorUid);
    return {
      output: { monitorUid: ctx.input.monitorUid.trim(), tags },
      message: `Found **${tags.length}** tags for monitor **${ctx.input.monitorUid}**.`
    };
  })
  .build();
