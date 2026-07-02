import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let checkBalance = SlateTool.create(spec, {
  name: 'Check Credit Balance',
  key: 'check_balance',
  description: `Check the SMS credit balance of your SMS Alert account. Returns credit breakdown by route (e.g., transactional, promotional, non-DND).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Credit balance details broken down by route.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    ctx.info('Checking credit balance');
    let result = await client.getCreditBalance();

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: `Credit balance retrieved: ${JSON.stringify(result.description || result)}`
    };
  })
  .build();
