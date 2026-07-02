import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMemberTransactions = SlateTool.create(spec, {
  name: 'Get Member Transactions',
  key: 'get_member_transactions',
  description: `Retrieve the transaction history for a specific member. Can filter by user ID or client ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('The user ID to retrieve transactions for.'),
      clientId: z.string().optional().describe('The client ID to retrieve transactions for.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      transactions: z.any().describe('The transaction records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let params: Record<string, any> = {};
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.clientId) params.client_id = ctx.input.clientId;

    let result = await client.getUserTransactions(params);

    return {
      output: {
        status: result.status,
        transactions: result.message
      },
      message: `Retrieved transaction history.`
    };
  })
  .build();
