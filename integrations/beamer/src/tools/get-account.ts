import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountTool = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Check which Beamer product is connected and retrieve its name. This request checks API-key authentication without modifying the account.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ name: z.string().describe('Connected product name') }))
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).ping();
    return { output, message: `Connected to Beamer product **${output.name}**.` };
  })
  .build();
