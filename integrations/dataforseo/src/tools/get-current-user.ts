import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the connected DataForSEO account and retrieve its timezone and available account balance. This read-only request does not consume API credits.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      login: z.string().describe('Connected account login'),
      timezone: z.string().optional().describe('Account timezone'),
      balance: z.number().optional().describe('Available account balance in USD'),
      totalDeposited: z.number().optional().describe('Total deposited funds in USD')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = client.extractFirstResult(await client.getCurrentUser());
    if (typeof account?.login !== 'string') {
      throw dataForSEOServiceError('DataForSEO did not return the connected account login.');
    }
    return {
      output: {
        login: account.login,
        timezone: typeof account.timezone === 'string' ? account.timezone : undefined,
        balance:
          typeof account.money?.balance === 'number' ? account.money.balance : undefined,
        totalDeposited:
          typeof account.money?.total === 'number' ? account.money.total : undefined
      },
      message: `Connected to DataForSEO as **${account.login}**.`
    };
  })
  .build();
