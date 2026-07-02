import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the current Bolna account information including wallet balance and concurrency limits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Account name'),
      email: z.string().optional().describe('Account email'),
      walletBalance: z.number().optional().describe('Current wallet balance'),
      maxConcurrentCalls: z.number().optional().describe('Maximum allowed concurrent calls'),
      currentConcurrentCalls: z
        .number()
        .optional()
        .describe('Currently active concurrent calls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let user = await client.getUserInfo();

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        walletBalance: user.wallet,
        maxConcurrentCalls: user.concurrency?.max,
        currentConcurrentCalls: user.concurrency?.current
      },
      message: `Account **${user.name || user.email}**: wallet balance ${user.wallet}, concurrency ${user.concurrency?.current || 0}/${user.concurrency?.max || 0}.`
    };
  })
  .build();
