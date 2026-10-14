import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Connected Account',
  key: 'who_am_i',
  description:
    'Retrieve the Chameleon account and administrator associated with the connected API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Connected Chameleon account ID'),
      userId: z.string().describe('Administrator ID associated with the API key'),
      account: z
        .record(z.string(), z.unknown())
        .describe('Account details returned by Chameleon'),
      user: z
        .record(z.string(), z.unknown())
        .describe('Administrator details returned by Chameleon')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ChameleonClient(ctx.auth.token).getAccount();
    return {
      output: {
        accountId: result.account.id,
        userId: result.user.id,
        account: result.account,
        user: result.user
      },
      message: `Connected to Chameleon account **${result.account.id}**.`
    };
  })
  .build();
