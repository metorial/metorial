import { SlateTool } from 'slates';
import { z } from 'zod';
import { accountCodeField, resolveAccountCode } from '../lib/account';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve your More Trees account details including account name, credit balance, forest name, and forest slug. Provide the account code from Settings > Account Settings, or use the account code already saved on your connection.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ accountCode: accountCodeField }))
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

    let account = await client.getAccountInfo(
      resolveAccountCode(ctx.input.accountCode, ctx.config)
    );

    return {
      output: account,
      message: `Account **${account.accountName}** has **${account.creditBalance}** credits remaining. Forest: **${account.forestName}** (\`${account.forestSlug}\`).`
    };
  })
  .build();
