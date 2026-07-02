import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the Klaviyo account associated with the current credentials, including account identity, contact information, timezone, currency, and public API key when available.
Use this to verify the connected account before making changes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fields: z
        .array(z.string())
        .optional()
        .describe('Optional Klaviyo account fields to return, e.g. ["contact_information"].')
    })
  )
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('Klaviyo account ID'),
            name: z.string().optional().describe('Account or organization name'),
            publicApiKey: z.string().optional().describe('Public API key / site ID'),
            timezone: z.string().optional().describe('Account timezone'),
            currency: z.string().optional().describe('Account currency'),
            contactInformation: z.any().optional().describe('Account contact information')
          })
        )
        .describe('Accounts returned by Klaviyo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getAccounts({ fields: ctx.input.fields });

    let accounts = result.data.map(account => ({
      accountId: account.id ?? '',
      name:
        account.attributes?.contact_information?.organization_name ??
        account.attributes?.organization_name ??
        undefined,
      publicApiKey:
        account.attributes?.public_api_key ??
        account.attributes?.public_api_key_id ??
        undefined,
      timezone: account.attributes?.timezone ?? undefined,
      currency: account.attributes?.currency ?? undefined,
      contactInformation: account.attributes?.contact_information ?? undefined
    }));

    return {
      output: { accounts },
      message: `Retrieved **${accounts.length}** Klaviyo account${accounts.length === 1 ? '' : 's'}`
    };
  })
  .build();
