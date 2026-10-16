import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the account associated with your API token, including subscription information and API usage limits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.object({
        name: z.string().optional().describe('Subscriber name'),
        email: z.string().optional().describe('Subscriber email'),
        subscriptionType: z.string().optional().describe('Subscription plan type'),
        paymentMethod: z.string().optional().describe('Payment method'),
        apiRequests: z
          .number()
          .optional()
          .describe('Calls used on the latest day of API usage'),
        apiRequestsDate: z.string().optional().describe('Date of the latest API usage count'),
        dailyRateLimit: z.number().optional().describe('Daily API call limit'),
        extraLimit: z.number().optional().describe('Remaining additionally purchased calls')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });
    let user = await client.getUserInfo();
    return { output: { user }, message: 'Retrieved your EODHD account and API usage.' };
  })
  .build();
