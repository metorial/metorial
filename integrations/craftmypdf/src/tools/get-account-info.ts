import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve CraftMyPDF account details including account name, remaining credits, team information, and subscription level.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountName: z.string().describe('Name of the account.'),
      credits: z.number().describe('Remaining API credits.'),
      teamId: z.string().describe('Team identifier.'),
      subscription: z.string().describe('Current subscription level.')
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
        accountName: result.account_name,
        credits: result.credits,
        teamId: result.team_id,
        subscription: result.subscription
      },
      message: `Account **${result.account_name}** — ${result.credits} credits remaining (${result.subscription}).`
    };
  })
  .build();
