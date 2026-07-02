import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve your More Trees account details including account name, credit balance, forest name, and forest slug. Uses the account code from configuration to look up your account.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountName: z.string().describe('Name of the account'),
      creditBalance: z.number().describe('Current credit balance'),
      forestName: z.string().describe('Name of the forest associated with this account'),
      forestSlug: z.string().describe('URL slug of the forest')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let account = await client.getAccountInfo(ctx.config.accountCode);

    return {
      output: account,
      message: `Account **${account.accountName}** has **${account.creditBalance}** credits remaining. Forest: **${account.forestName}** (\`${account.forestSlug}\`).`
    };
  })
  .build();
