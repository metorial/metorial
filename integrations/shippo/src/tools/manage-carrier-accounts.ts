import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let listCarrierAccounts = SlateTool.create(spec, {
  name: 'List Carrier Accounts',
  key: 'list_carrier_accounts',
  description: `Retrieve all connected carrier accounts. Use this to see which carriers are available for rate shopping and label creation. Filter by carrier name to find specific accounts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      carrier: z
        .string()
        .optional()
        .describe('Filter by carrier name (e.g. usps, fedex, ups)'),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of carrier accounts'),
      carrierAccounts: z.array(
        z.object({
          carrierAccountId: z.string(),
          carrier: z.string().optional(),
          accountId: z.string().optional().describe('Your account ID with the carrier'),
          active: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = await client.listCarrierAccounts({
      carrier: ctx.input.carrier,
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let carrierAccounts = result.results.map((ca: any) => ({
      carrierAccountId: ca.object_id,
      carrier: ca.carrier,
      accountId: ca.account_id,
      active: ca.active
    }));

    return {
      output: {
        totalCount: result.count,
        carrierAccounts
      },
      message: `Found **${result.count}** carrier accounts.${ctx.input.carrier ? ` Filtered by: ${ctx.input.carrier}.` : ''}`
    };
  })
  .build();
