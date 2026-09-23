import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description:
    'Update the name or anonymous data sharing setting of a Google Tag Manager account.',
  instructions: [
    'Call list_accounts (tag_manager_list_accounts in the combined Google connection) to discover an account ID before updating it.',
    'Provide at least one of name or shareData. Other account settings are preserved.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.updateAccount)
  .input(
    z.object({
      accountId: z
        .string()
        .describe(
          'Account ID. Call list_accounts (tag_manager_list_accounts in the combined Google connection) to discover authorized IDs.'
        ),
      name: z.string().min(1).optional().describe('New account display name'),
      shareData: z
        .boolean()
        .optional()
        .describe('Whether to share anonymous account data for benchmarking')
    })
  )
  .output(
    z.object({
      accountId: z.string().optional().describe('Account ID'),
      name: z.string().optional().describe('Account display name'),
      shareData: z.boolean().optional().describe('Whether anonymous data sharing is enabled'),
      fingerprint: z.string().optional().describe('Updated account fingerprint'),
      tagManagerUrl: z.string().optional().describe('URL to this account in Tag Manager')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.name === undefined && ctx.input.shareData === undefined) {
      throw createApiServiceError('Provide name or shareData to update the account.', {
        reason: 'google_tag_manager_account_update_empty'
      });
    }

    let client = new GtmClient(ctx.auth.token);
    let account = await client.updateAccount(ctx.input.accountId, {
      name: ctx.input.name,
      shareData: ctx.input.shareData
    });

    return {
      output: account,
      message: `Updated account **"${account.name}"** (ID: \`${account.accountId}\`)`
    };
  })
  .build();
