import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLinkedInAccounts = SlateTool.create(spec, {
  name: 'Get LinkedIn Accounts',
  key: 'get_linkedin_accounts',
  description: `Retrieve all connected LinkedIn sender accounts in your HeyReach workspace. Returns account details including status, capacity, and availability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Number of accounts to return (default: 50)'),
      offset: z.number().optional().default(0).describe('Pagination offset (default: 0)'),
      keyword: z.string().optional().describe('Filter accounts by keyword')
    })
  )
  .output(
    z.object({
      accounts: z.array(z.any()).describe('Array of LinkedIn sender account objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAllLinkedInAccounts(
      ctx.input.limit,
      ctx.input.offset,
      ctx.input.keyword
    );
    let accounts = Array.isArray(result) ? result : (result?.data ?? result?.items ?? []);

    return {
      output: { accounts },
      message: `Retrieved **${accounts.length}** LinkedIn sender account(s).`
    };
  })
  .build();
