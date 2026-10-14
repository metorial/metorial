import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { accountIdSchema, accountSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Retrieve a tracked website account, including subscription, timezone, and website tracking status. Call get_accounts to discover accessible account IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ accountId: accountIdSchema }))
  .output(accountSchema)
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);
    let accountId = await client.resolveAccountId(ctx.input.accountId ?? ctx.config.accountId);
    let account = await client.getAccount(accountId);
    return {
      output: account,
      message: `Retrieved account **${account.name}** (tracking status: ${account.websiteTrackingStatus}).`
    };
  })
  .build();
