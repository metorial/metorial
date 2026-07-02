import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAdAccounts = SlateTool.create(spec, {
  name: 'List Ad Accounts',
  key: 'list_ad_accounts',
  description: `List LinkedIn advertising accounts accessible to the authenticated user. Optionally filter by name. Returns account details including status, currency, and budget information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter accounts by name'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.number().describe('Numeric ID of the ad account'),
          name: z.string().describe('Name of the ad account'),
          status: z.string().describe('Account status (ACTIVE, CANCELED, DRAFT, etc.)'),
          type: z.string().describe('Account type (BUSINESS, ENTERPRISE)'),
          currency: z.string().describe('Currency code for the account'),
          reference: z.string().describe('URN of the associated organization'),
          servingStatuses: z.array(z.string()).optional().describe('Current serving statuses')
        })
      ),
      totalCount: z.number().optional().describe('Total number of accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAdAccounts({
      search: ctx.input.search,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let accounts = result.elements.map(account => ({
      accountId: account.id,
      name: account.name,
      status: account.status,
      type: account.type,
      currency: account.currency,
      reference: account.reference,
      servingStatuses: account.servingStatuses
    }));

    return {
      output: {
        accounts,
        totalCount: result.paging?.total
      },
      message: `Found **${accounts.length}** ad account(s).${accounts.length > 0 ? ` Accounts: ${accounts.map(a => `${a.name} (${a.status})`).join(', ')}` : ''}`
    };
  })
  .build();
