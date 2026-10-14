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
      accounts: z.array(z.any()).describe('Array of LinkedIn sender account objects'),
      totalCount: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Total matching records reported by HeyReach')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAllLinkedInAccounts(
      ctx.input.limit,
      ctx.input.offset,
      ctx.input.keyword
    );
    let page = result?.data ?? result;
    let accounts = Array.isArray(page) ? page : (page?.items ?? []);

    return {
      output: { accounts, totalCount: page?.totalCount },
      message: `Retrieved **${accounts.length}** LinkedIn sender account(s).`
    };
  })
  .build();
