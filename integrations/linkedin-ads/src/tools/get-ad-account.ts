import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdField } from '../lib/schemas';
import { spec } from '../spec';

export let getAdAccount = SlateTool.create(spec, {
  name: 'Get Ad Account',
  key: 'get_ad_account',
  description: `Retrieve detailed information about a specific LinkedIn ad account by its ID, including status, budget, currency, and notification settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_ads', 'rw_ads'))
  .input(
    z.object({
      accountId: accountIdField
    })
  )
  .output(
    z.object({
      test: z
        .boolean()
        .optional()
        .describe('Provider test account flag; test ads are not served or billed'),
      accountId: z.number().describe('Numeric ID of the ad account'),
      name: z.string().describe('Name of the ad account'),
      status: z.string().describe('Account status'),
      type: z.string().describe('Account type'),
      currency: z.string().describe('Currency code'),
      reference: z.string().describe('URN of the associated organization'),
      servingStatuses: z.array(z.string()).optional().describe('Current serving statuses'),
      totalBudget: z
        .object({
          amount: z.string(),
          currencyCode: z.string()
        })
        .optional()
        .describe('Total budget for the account'),
      notifiedOnCreativeApproval: z.boolean().optional(),
      notifiedOnCreativeRejection: z.boolean().optional(),
      notifiedOnEndOfCampaign: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAdAccount(ctx.input.accountId);

    return {
      output: {
        accountId: account.id,
        test: account.test,
        name: account.name,
        status: account.status,
        type: account.type,
        currency: account.currency,
        reference: account.reference,
        servingStatuses: account.servingStatuses,
        totalBudget: account.totalBudget,
        notifiedOnCreativeApproval: account.notifiedOnCreativeApproval,
        notifiedOnCreativeRejection: account.notifiedOnCreativeRejection,
        notifiedOnEndOfCampaign: account.notifiedOnEndOfCampaign
      },
      message: `Retrieved ad account **${account.name}** (ID: ${account.id}, Status: ${account.status}).`
    };
  })
  .build();
