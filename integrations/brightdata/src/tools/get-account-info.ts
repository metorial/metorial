import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve your Bright Data account status and balance information, including customer ID, account status, whether requests can be made, current balance, and pending balance.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Account status (e.g., "active").'),
      customerId: z.string().describe('Unique customer/account ID.'),
      canMakeRequests: z
        .boolean()
        .describe('Whether the account can currently make API requests.'),
      authFailReason: z.string().describe('Reason for authentication failure, if any.'),
      ip: z.string().describe('IP address of the requesting client.'),
      balance: z.number().describe('Current account balance in USD.'),
      pendingBalance: z.number().describe('Pending balance in USD.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });

    let [accountStatus, balance] = await Promise.all([
      client.getAccountStatus(),
      client.getBalance()
    ]);

    let output = {
      ...accountStatus,
      ...balance
    };

    return {
      output,
      message: `Account **${output.customerId}** is **${output.status}**. Balance: **$${output.balance}** (pending: $${output.pendingBalance}). Requests ${output.canMakeRequests ? 'can' : 'cannot'} be made.`
    };
  })
  .build();
