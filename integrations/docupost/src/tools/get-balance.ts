import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Account Balance',
  key: 'get_account_balance',
  description: `Request account balance information using the existing balance endpoint. This legacy endpoint is not described in the current public API guide; if unavailable, review Funds in the DocuPost dashboard before sending mail.`,
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

    ctx.info('Balance request completed');

    return {
      output: {
        balance:
          isApiErrorRecord(result) &&
          isApiErrorRecord(result.response) &&
          'balance' in result.response
            ? result.response.balance
            : result,
        response: result
      },
      message:
        'Account balance request completed. Inspect the returned response or the Funds section in DocuPost.'
    };
  })
  .build();
