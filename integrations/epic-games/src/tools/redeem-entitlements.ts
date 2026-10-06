import { SlateTool } from 'slates';
import { z } from 'zod';
import { accountClient, resolvedSandbox } from '../lib/client';
import { spec } from '../spec';

export let redeemEntitlements = SlateTool.create(spec, {
  name: 'Redeem Entitlements',
  key: 'redeem_entitlements',
  description: `Consume/redeem consumable entitlements for a player. This marks entitlements as redeemed, incrementing their use count. Typically used for in-game purchases, consumable items, or one-time-use content.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Epic Games account ID of the player'),
      entitlementIds: z.array(z.string()).min(1).describe('Entitlement IDs to redeem/consume'),
      sandboxId: z
        .string()
        .optional()
        .describe(
          'Sandbox ID. Uses the auth-observed or validated legacy sandbox only when available.'
        )
    })
  )
  .output(
    z.object({
      outcome: z
        .literal('accepted')
        .optional()
        .describe('The provider accepted the consumption request.'),
      entitlementIds: z.array(z.string()).optional().describe('Requested entitlement IDs.'),
      upstreamStatus: z.number().optional().describe('Successful native response status.'),
      redeemed: z
        .boolean()
        .describe(
          'Whether Epic accepted the redemption request; game delivery is not verified'
        )
    })
  )
  .handleInvocation(async ctx => {
    const receipt = await accountClient(ctx).redeemEntitlements(
      ctx.input.accountId,
      ctx.input.entitlementIds,
      resolvedSandbox(ctx, ctx.input.sandboxId)
    );
    return {
      output: {
        redeemed: true,
        outcome: 'accepted' as const,
        entitlementIds: ctx.input.entitlementIds,
        upstreamStatus: receipt.status
      },
      message:
        'Epic accepted the redemption request. Consumption is irreversible; a successful request does not prove an in-game award was delivered.'
    };
  })
  .build();
