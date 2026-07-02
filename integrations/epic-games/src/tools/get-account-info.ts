import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosAccountServicesClient } from '../lib/client';
import { spec } from '../spec';

let accountInfoSchema = z.object({
  accountId: z.string().describe('Epic Games account ID'),
  displayName: z.string().optional().describe('Public display name'),
  preferredLanguage: z.string().optional().describe('User preferred language'),
  linkedAccounts: z
    .array(
      z.object({
        identityProviderId: z.string().optional(),
        displayName: z.string().optional()
      })
    )
    .optional()
    .describe('Linked external accounts')
});

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Epic Games account information for one or more accounts. Returns display names, preferred language, and linked external accounts.
Supports batch lookups of up to 50 accounts in a single request. Requires the **basic_profile** scope via OAuth authentication.`,
  constraints: ['Maximum 50 account IDs per request'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountIds: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('Epic Games account IDs to look up')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(accountInfoSchema)
        .describe('Account information for the requested IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosAccountServicesClient({
      token: ctx.auth.token,
      accountId: ctx.auth.accountId
    });

    let data = await client.getAccounts(ctx.input.accountIds);
    let accounts = Array.isArray(data) ? data : [data];

    return {
      output: { accounts },
      message: `Retrieved account info for **${accounts.length}** Epic Games account(s).`
    };
  })
  .build();
