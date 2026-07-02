import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
import { spec } from '../spec';

let accountSchema = z.object({
  accountId: z.string().describe('External account ID'),
  identityProviderId: z.string().describe('Identity provider (e.g. steam, psn, xbl)'),
  displayName: z.string().optional().describe('Display name from the identity provider'),
  lastLogin: z.string().optional().describe('Last login timestamp (ISO 8601)')
});

export let lookupProductUser = SlateTool.create(spec, {
  name: 'Lookup Product User',
  key: 'lookup_product_user',
  description: `Look up EOS Product User IDs from external platform account IDs, or resolve Product User IDs to their linked external accounts.
Use this to map between platform-specific accounts (Steam, PlayStation, Xbox, etc.) and EOS Product User IDs for cross-platform identity resolution.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productUserIds: z
        .array(z.string())
        .max(16)
        .optional()
        .describe('EOS Product User IDs to resolve to their linked external accounts'),
      externalAccountIds: z
        .array(z.string())
        .max(16)
        .optional()
        .describe('External platform account IDs to look up'),
      identityProvider: z
        .enum([
          'amazon',
          'apple',
          'discord',
          'epicgames',
          'gog',
          'google',
          'itchio',
          'nintendo',
          'oculus',
          'openid',
          'psn',
          'steam',
          'xbl'
        ])
        .optional()
        .describe(
          'Identity provider for external account lookup. Required when using externalAccountIds.'
        ),
      environment: z
        .string()
        .optional()
        .describe('Platform-specific environment (e.g. "xbl_retail" for Xbox retail)')
    })
  )
  .output(
    z.object({
      externalToProductUser: z
        .record(z.string(), z.string())
        .optional()
        .describe('Map of external account IDs to Product User IDs'),
      productUserAccounts: z
        .record(z.string(), z.array(accountSchema))
        .optional()
        .describe('Map of Product User IDs to their linked external accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosGameServicesClient({
      token: ctx.auth.token,
      deploymentId: ctx.config.deploymentId
    });

    let result: {
      externalToProductUser?: Record<string, string>;
      productUserAccounts?: Record<
        string,
        Array<{
          accountId: string;
          identityProviderId: string;
          displayName?: string;
          lastLogin?: string;
        }>
      >;
    } = {};

    if (ctx.input.externalAccountIds && ctx.input.externalAccountIds.length > 0) {
      if (!ctx.input.identityProvider) {
        throw new Error('identityProvider is required when looking up external account IDs');
      }
      let data = await client.queryExternalAccounts(
        ctx.input.externalAccountIds,
        ctx.input.identityProvider,
        ctx.input.environment
      );
      result.externalToProductUser = data.ids ?? {};
    }

    if (ctx.input.productUserIds && ctx.input.productUserIds.length > 0) {
      let data = await client.queryProductUsers(ctx.input.productUserIds);
      let accounts: Record<
        string,
        Array<{
          accountId: string;
          identityProviderId: string;
          displayName?: string;
          lastLogin?: string;
        }>
      > = {};
      if (data.productUsers) {
        for (let [puid, userInfo] of Object.entries(
          data.productUsers as Record<string, any>
        )) {
          accounts[puid] = userInfo.accounts ?? [];
        }
      }
      result.productUserAccounts = accounts;
    }

    let totalLookups =
      (ctx.input.externalAccountIds?.length ?? 0) + (ctx.input.productUserIds?.length ?? 0);
    return {
      output: result,
      message: `Resolved **${totalLookups}** identity lookups across EOS Product Users and external accounts.`
    };
  })
  .build();
