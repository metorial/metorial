import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let adAccountSchema = z.object({
  adAccountId: z.string().describe('Unique ID of the ad account'),
  name: z.string().describe('Name of the ad account'),
  organizationId: z.string().optional().describe('Parent organization ID'),
  status: z.string().optional().describe('Ad account status'),
  type: z.string().optional().describe('Ad account type'),
  currency: z.string().optional().describe('Currency code (e.g., USD)'),
  timezone: z.string().optional().describe('Timezone of the ad account'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listAdAccounts = SlateTool.create(spec, {
  name: 'List Ad Accounts',
  key: 'list_ad_accounts',
  description: `List all ad accounts under a Snapchat organization. Returns account IDs, names, currencies, timezones, and statuses. Use organization IDs from the List Organizations tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('ID of the organization to list ad accounts for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of ad accounts to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      adAccounts: z.array(adAccountSchema).describe('List of ad accounts'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listAdAccounts(
      ctx.input.organizationId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let adAccounts = result.items.map((a: any) => ({
      adAccountId: a.id,
      name: a.name,
      organizationId: a.organization_id,
      status: a.status,
      type: a.type,
      currency: a.currency,
      timezone: a.timezone,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { adAccounts, nextLink: result.nextLink },
      message: `Found **${adAccounts.length}** ad account(s).`
    };
  })
  .build();
