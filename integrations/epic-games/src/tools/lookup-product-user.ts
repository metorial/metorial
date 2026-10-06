import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
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
    if (!ctx.input.externalAccountIds?.length && !ctx.input.productUserIds?.length)
      throw createApiServiceError(
        'Supply Product User IDs or external account IDs to resolve.'
      );
    if (ctx.input.externalAccountIds?.length && !ctx.input.identityProvider)
      throw createApiServiceError('identityProvider is required for external-account lookup.');
    if (ctx.input.environment && !ctx.input.externalAccountIds?.length)
      throw createApiServiceError('environment applies only to external-account lookup.');
    const client = gameClient(ctx);
    const external = ctx.input.externalAccountIds?.length
      ? await client.queryExternalAccounts(
          ctx.input.externalAccountIds,
          ctx.input.identityProvider!,
          ctx.input.environment
        )
      : undefined;
    const users = ctx.input.productUserIds?.length
      ? await client.queryProductUsers(ctx.input.productUserIds)
      : undefined;
    return {
      output: {
        externalToProductUser: external?.ids,
        productUserAccounts: users
          ? Object.fromEntries(
              Object.entries(users.productUsers).map(([id, row]) => [id, row.accounts])
            )
          : undefined
      },
      message:
        'Returned the resolved identity mappings. Unmatched IDs are omitted by Epic; no account creation occurred.'
    };
  })
  .build();
