import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, rawSchema } from '../lib/client';
import { spec } from '../spec';

export let getAccountHome = SlateTool.create(spec, {
  key: 'get_account_home',
  name: 'Get Account Home',
  description:
    'Retrieve the authenticated account home, including the provider message and links to available account resources. Doppler exposes this resource for ordinary accounts; detailed managed-user profiles require Client Manager access.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ message: z.string(), raw: rawSchema }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    let raw = await client.getAccountHome();
    return {
      output: { message: raw.message, raw },
      message: 'Retrieved Doppler account home.'
    };
  })
  .build();
