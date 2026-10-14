import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Signal API Account',
  key: 'get_account',
  description:
    'Retrieve the authenticated Signal API account identifier, name, request rate limit, and current credit balance. This lookup does not consume credits.',
  tags: { readOnly: true }
})
  .authMethods(['api_key', 'signal_api_key'])
  .input(z.object({}))
  .output(
    z.object({
      customerId: z.string().optional().describe('Authenticated account identifier'),
      customerName: z.string().optional().describe('Account holder name'),
      rateLimit: z.number().optional().describe('Maximum requests per minute'),
      credits: z
        .record(z.string(), z.any())
        .optional()
        .describe('Running credit balance, consumption, grants, and exemption status'),
      rawResponse: z.record(z.string(), z.any()).describe('Complete provider account response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token, ctx.auth.signalToken ?? ctx.auth.token);
    let result = await client.getAccount();
    return {
      output: {
        customerId: result.customer_id,
        customerName: result.customer_name,
        rateLimit: result.rate_limit,
        credits: result.credits,
        rawResponse: result
      },
      message: 'Retrieved the authenticated Signal API account.'
    };
  })
  .build();
