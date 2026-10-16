import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getList = SlateTool.create(spec, {
  name: 'Get List',
  key: 'get_list',
  description: 'Retrieve a conversion list by ID. Call get_lists to discover list IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ listId: z.string().min(1).describe('List ID from get_lists') }))
  .output(
    z.object({ list: z.unknown().describe('Unmodified list response from Sidetracker') })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let list = await client.getList(ctx.input.listId);
    return { output: { list }, message: `Retrieved list \`${ctx.input.listId}\`.` };
  })
  .build();
