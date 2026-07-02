import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAdAccounts = SlateTool.create(spec, {
  name: 'List Ad Accounts',
  key: 'list_ad_accounts',
  description: `List ad accounts accessible to the authenticated user. Includes account details like name, country, currency, and permissions. Can also retrieve a specific ad account by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adAccountId: z
        .string()
        .optional()
        .describe('If provided, retrieves this specific ad account instead of listing all'),
      includeSharedAccounts: z
        .boolean()
        .optional()
        .describe('Include shared ad accounts in the results'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous response'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of accounts to return (max 250, default 25)')
    })
  )
  .output(
    z.object({
      adAccounts: z
        .array(
          z.object({
            adAccountId: z.string().describe('ID of the ad account'),
            name: z.string().optional().describe('Name of the ad account'),
            country: z.string().optional().describe('Country code'),
            currency: z.string().optional().describe('Currency code'),
            owner: z.any().optional().describe('Owner information'),
            permissions: z
              .array(z.string())
              .optional()
              .describe('User permissions for this account'),
            createdTime: z.number().optional().describe('Account creation timestamp')
          })
        )
        .optional()
        .describe('List of ad accounts'),
      singleAccount: z
        .any()
        .optional()
        .describe('Single ad account details when queried by ID'),
      bookmark: z.string().optional().describe('Bookmark for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.adAccountId) {
      let result = await client.getAdAccount(ctx.input.adAccountId);

      return {
        output: {
          adAccounts: [
            {
              adAccountId: result.id,
              name: result.name,
              country: result.country,
              currency: result.currency,
              owner: result.owner,
              permissions: result.permissions,
              createdTime: result.created_time
            }
          ]
        },
        message: `Retrieved ad account **${result.name || result.id}**.`
      };
    }

    let result = await client.listAdAccounts({
      bookmark: ctx.input.bookmark,
      pageSize: ctx.input.pageSize,
      includeSharedAccounts: ctx.input.includeSharedAccounts
    });

    let adAccounts = (result.items || []).map((account: any) => ({
      adAccountId: account.id,
      name: account.name,
      country: account.country,
      currency: account.currency,
      owner: account.owner,
      permissions: account.permissions,
      createdTime: account.created_time
    }));

    return {
      output: {
        adAccounts,
        bookmark: result.bookmark ?? undefined
      },
      message: `Found **${adAccounts.length}** ad account(s).${result.bookmark ? ' More results available with bookmark.' : ''}`
    };
  })
  .build();
