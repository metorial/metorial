import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the connected CraftMyPDF account username, quota counters, template limits, and creation date. Additional account details are included when available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountName: z.string().describe('Name of the account.'),
      credits: z.number().optional().describe('Remaining API credits when provided.'),
      teamId: z.string().optional().describe('Team identifier when provided.'),
      subscription: z
        .string()
        .optional()
        .describe('Current subscription level when provided.'),
      username: z.string().describe('Username of the connected account.'),
      quotaCounter: z.number().describe('Current quota counter.'),
      quotaMax: z.number().describe('Maximum account quota.'),
      templateCounter: z.number().describe('Current template count.'),
      templateMax: z.number().describe('Maximum template count.'),
      createdAt: z.string().describe('Account creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getAccountInfo();

    return {
      output: {
        accountName: result.account_name ?? result.username,
        credits: result.credits,
        teamId: result.team_id,
        subscription: result.subscription,
        username: result.username,
        quotaCounter: result.quota_counter,
        quotaMax: result.quota_max,
        templateCounter: Number(result.template_counter),
        templateMax: result.template_max,
        createdAt: result.created_at
      },
      message: `Connected CraftMyPDF account **${result.username}**; quota counter ${result.quota_counter} of ${result.quota_max}.`
    };
  })
  .build();
