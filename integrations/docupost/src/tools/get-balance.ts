import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Account Balance',
  key: 'get_account_balance',
  description: `Retrieve your current DocuPost account balance. Use this to verify you have sufficient funds before sending letters or postcards, as mailings are charged against your prepaid balance.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.any().describe('Current account balance information'),
      response: z.any().optional().describe('Raw response from the DocuPost API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBalance();

    ctx.info('Balance retrieved successfully');

    return {
      output: {
        balance: result?.response?.balance ?? result,
        response: result
      },
      message: `Account balance retrieved successfully.`
    };
  })
  .build();
