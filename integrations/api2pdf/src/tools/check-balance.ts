import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

export let checkBalance = SlateTool.create(spec, {
  name: 'Check Balance',
  key: 'check_balance',
  description: `Check the remaining credit balance on the API2PDF account associated with the current API key.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.number().describe('Remaining credit balance in USD')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.getBalance();

    return {
      output: {
        balance: result.balance
      },
      message: `Account balance: **$${result.balance}**`
    };
  })
  .build();
