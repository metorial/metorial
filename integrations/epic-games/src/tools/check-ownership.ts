import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosAccountServicesClient } from '../lib/client';
import { spec } from '../spec';

let ownershipItemSchema = z.object({
  namespace: z.string().describe('Sandbox/namespace ID'),
  itemId: z.string().describe('Catalog item ID'),
  owned: z.boolean().describe('Whether the player owns this item')
});

export let checkOwnership = SlateTool.create(spec, {
  name: 'Check Ownership',
  key: 'check_ownership',
  description: `Verify whether a player owns specific games, DLC, or catalog items on the Epic Games Store. Can check ownership of specific items by ID or list all owned items in a sandbox.
Requires OAuth authentication with the account to verify.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Epic Games account ID to check ownership for'),
      catalogItemIds: z
        .array(z.string())
        .optional()
        .describe('Catalog item IDs to check, in format "sandboxId:catalogItemId"'),
      sandboxId: z
        .string()
        .optional()
        .describe(
          'Sandbox ID to list all owned items in. Uses the configured sandboxId if not provided.'
        )
    })
  )
  .output(
    z.object({
      ownership: z
        .array(ownershipItemSchema)
        .describe('Ownership status for each queried item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosAccountServicesClient({
      token: ctx.auth.token,
      accountId: ctx.auth.accountId
    });

    let sandboxId = ctx.input.sandboxId ?? ctx.config.sandboxId;
    let data = await client.checkOwnership(
      ctx.input.accountId,
      ctx.input.catalogItemIds,
      sandboxId
    );
    let ownership = Array.isArray(data) ? data : [];

    let ownedCount = ownership.filter((item: any) => item.owned).length;

    return {
      output: { ownership },
      message: `Player owns **${ownedCount}** out of **${ownership.length}** checked item(s).`
    };
  })
  .build();
