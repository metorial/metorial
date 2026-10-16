import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outputSchema = z.object({
  accountId: z.string().describe('Account identifier'),
  name: z.string().describe('Account name'),
  raw: z.record(z.string(), z.unknown()).describe('Account profile returned by Givebutter')
});

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Identify the connected Givebutter account and retrieve its public organization profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccount();
    return {
      output: client.output(outputSchema, {
        accountId: String(account.id),
        name: account.name,
        raw: account
      }),
      message: client.publicData(`Connected to **${account.name}**.`)
    };
  })
  .build();
