import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description: `Retrieve the current credit balance on your More Trees account. Credits are consumed when trees are planted, with each tree type requiring a specific number of credits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditBalance: z.number().describe('Current credit balance on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let result = await client.viewCredits();

    return {
      output: result,
      message: `Credit balance: **${result.creditBalance}** credits.`
    };
  })
  .build();
