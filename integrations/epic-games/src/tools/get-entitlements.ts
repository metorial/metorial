import { SlateTool } from 'slates';
import { z } from 'zod';
import { accountClient, resolvedSandbox } from '../lib/client';
import { spec } from '../spec';

let entitlementSchema = z.object({
  entitlementId: z.string().describe('Unique entitlement ID'),
  entitlementName: z.string().describe('Entitlement name'),
  namespace: z.string().describe('Sandbox/namespace'),
  catalogItemId: z.string().describe('Associated catalog item ID'),
  entitlementType: z.string().describe('Type of entitlement'),
  grantDate: z.string().describe('When the entitlement was granted (ISO 8601)'),
  consumable: z.boolean().describe('Whether the entitlement is consumable'),
  status: z.string().describe('Entitlement status (e.g. ACTIVE)'),
  useCount: z.number().describe('Number of times this entitlement has been used'),
  entitlementSource: z.string().optional().describe('Source of the entitlement')
});

export let getEntitlements = SlateTool.create(spec, {
  name: 'Get Entitlements',
  key: 'get_entitlements',
  description: `Enumerate a player's entitlements for a given sandbox. Returns detailed entitlement records including grant dates, consumable status, and use counts.
Can optionally filter by entitlement name and include already-redeemed entitlements.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Epic Games account ID'),
      sandboxId: z
        .string()
        .optional()
        .describe(
          'Sandbox ID. Uses the auth-observed or validated legacy sandbox only when available.'
        ),
      entitlementNames: z
        .array(z.string())
        .optional()
        .describe('Filter by specific entitlement names'),
      includeRedeemed: z
        .boolean()
        .default(false)
        .describe('Whether to include already redeemed/consumed entitlements')
    })
  )
  .output(
    z.object({
      entitlements: z.array(entitlementSchema).describe('Player entitlement records')
    })
  )
  .handleInvocation(async ctx => {
    const data = await accountClient(ctx).getEntitlements(
      ctx.input.accountId,
      resolvedSandbox(ctx, ctx.input.sandboxId),
      ctx.input.entitlementNames,
      ctx.input.includeRedeemed
    );
    const entitlements = data.map(({ id, ...record }) => ({ entitlementId: id, ...record }));
    return {
      output: { entitlements },
      message: `Returned ${entitlements.length} native entitlement record(s). No redemption occurred.`
    };
  })
  .build();
