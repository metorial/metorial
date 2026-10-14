import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAction = SlateTool.create(spec, {
  name: 'Get Action',
  key: 'get_action',
  description:
    'Retrieve a constituent action by ID, including its completion state and associated fundraising records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID returned by list_actions or create_action.')
    })
  )
  .output(z.object({ action: z.any().describe('The action record.') }))
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let action = await client.getAction(ctx.input.actionId);
    return { output: { action }, message: `Retrieved action **${ctx.input.actionId}**.` };
  })
  .build();
