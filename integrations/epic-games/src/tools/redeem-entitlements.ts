import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosAccountServicesClient } from '../lib/client';
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
        .describe('Sandbox ID. Uses the configured sandboxId if not provided.')
    })
  )
  .output(
    z.object({
      redeemed: z.boolean().describe('Whether the entitlements were successfully redeemed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosAccountServicesClient({
      token: ctx.auth.token,
      accountId: ctx.auth.accountId
    });

    let sandboxId = ctx.input.sandboxId ?? ctx.config.sandboxId;
    if (!sandboxId) {
      throw new Error('sandboxId is required either in the input or in the configuration');
    }

    await client.redeemEntitlements(ctx.input.accountId, ctx.input.entitlementIds, sandboxId);

    return {
      output: { redeemed: true },
      message: `Successfully redeemed **${ctx.input.entitlementIds.length}** entitlement(s) for account \`${ctx.input.accountId}\`.`
    };
  })
  .build();
