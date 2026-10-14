import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountBalanceTool = SlateTool.create(spec, {
  name: 'Get Account Balance',
  key: 'get_account_balance',
  description:
    'Retrieve the TelTel account balance, current credit, and credit limit before placing calls or sending messages.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ balance: z.any().describe('Account balance information returned by TelTel') })
  )
  .handleInvocation(async ctx => {
    let response = await new TelTelClient(ctx.auth.token).getAccountBalance();
    return {
      output: { balance: response?.data ?? response },
      message: 'Retrieved account balance.'
    };
  })
  .build();
