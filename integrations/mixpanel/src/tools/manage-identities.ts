import { SlateTool } from 'slates';
import { z } from 'zod';
import { mixpanelServiceError } from '../lib/errors';
import {
  createClientFromContext,
  requireProjectToken,
  requireServiceAccount
} from '../lib/helpers';
import { spec } from '../spec';

export let manageIdentities = SlateTool.create(spec, {
  name: 'Manage Identities',
  key: 'manage_identities',
  description: `Link anonymous and identified users or merge two distinct IDs in Mixpanel's identity management system.
Use **identify** to connect a pre-login anonymous ID with a post-login user ID.
Use **merge** to combine two distinct IDs into one identity cluster. Merging is **irreversible**.`,
  instructions: [
    'The identify operation is for the Original ID Merge system only.',
    'The merge operation requires Service Account authentication and is irreversible.'
  ],
  constraints: ['Merge operations cannot be undone.', 'ID clusters are limited to 500 IDs.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z.enum(['identify', 'merge']).describe('Identity operation to perform'),
      identifiedId: z.string().optional().describe('Known user ID (for identify operation)'),
      anonId: z
        .string()
        .optional()
        .describe('Anonymous/device ID to link (for identify operation)'),
      distinctId1: z.string().optional().describe('First distinct ID (for merge operation)'),
      distinctId2: z.string().optional().describe('Second distinct ID (for merge operation)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'identify') {
      requireProjectToken(ctx);
      if (!ctx.input.identifiedId?.trim() || !ctx.input.anonId?.trim()) {
        throw mixpanelServiceError(
          'identifiedId and anonId are required for identify operations.'
        );
      }

      let result = await client.createIdentity(ctx.input.identifiedId, ctx.input.anonId);
      return {
        output: { success: result.success },
        message: result.success
          ? `Linked anonymous ID \`${ctx.input.anonId}\` to identified ID \`${ctx.input.identifiedId}\`.`
          : `Failed to link identities.`
      };
    }

    if (operation === 'merge') {
      requireServiceAccount(ctx);
      requireProjectToken(ctx);
      if (!ctx.input.distinctId1?.trim() || !ctx.input.distinctId2?.trim()) {
        throw mixpanelServiceError(
          'distinctId1 and distinctId2 are required for merge operations.'
        );
      }

      let result = await client.mergeIdentities(ctx.input.distinctId1, ctx.input.distinctId2);
      return {
        output: { success: result.success },
        message: result.success
          ? `Merged \`${ctx.input.distinctId1}\` and \`${ctx.input.distinctId2}\` into one identity cluster.`
          : `Failed to merge identities.`
      };
    }

    throw mixpanelServiceError(`Unsupported identity operation: ${operation}`);
  })
  .build();
