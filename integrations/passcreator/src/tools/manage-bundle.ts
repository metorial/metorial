import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBundle = SlateTool.create(spec, {
  name: 'Manage Pass Bundle',
  key: 'manage_bundle',
  description: `Create, update, retrieve, void, or delete a pass bundle. Bundles allow distributing up to 10 wallet passes in a single download. Use this to manage the lifecycle of pass bundles.`,
  instructions: [
    'To create a bundle, provide passIds without a bundleId.',
    'To update a bundle, provide both bundleId and passIds.',
    'To retrieve a bundle, provide bundleId with action "get".',
    'To void/unvoid all passes in a bundle, provide bundleId with action "void" or "unvoid".',
    'To delete a bundle (without deleting its passes), provide bundleId with action "delete".'
  ],
  constraints: ['A bundle can contain a maximum of 10 passes.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'void', 'unvoid', 'delete'])
        .describe('Action to perform on the bundle'),
      bundleId: z
        .string()
        .optional()
        .describe('Bundle identifier (required for update, get, void, unvoid, delete)'),
      passIds: z
        .array(z.string())
        .optional()
        .describe('Array of pass identifiers (required for create and update, max 10)')
    })
  )
  .output(
    z.object({
      bundleId: z.string().optional().describe('Bundle identifier'),
      downloadUrl: z.string().optional().describe('URL to download the bundled passes'),
      passes: z.array(z.string()).optional().describe('Pass identifiers in the bundle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.passIds || ctx.input.passIds.length === 0) {
          throw new Error('passIds is required for creating a bundle');
        }
        let result = await client.createBundle(ctx.input.passIds);
        return {
          output: {
            bundleId: result.bundleId,
            downloadUrl: result.urlToPass,
            passes: ctx.input.passIds
          },
          message: `Created bundle \`${result.bundleId}\` with **${ctx.input.passIds.length}** pass(es).`
        };
      }
      case 'update': {
        if (!ctx.input.bundleId) throw new Error('bundleId is required for updating a bundle');
        if (!ctx.input.passIds || ctx.input.passIds.length === 0) {
          throw new Error('passIds is required for updating a bundle');
        }
        let result = await client.updateBundle(ctx.input.bundleId, ctx.input.passIds);
        return {
          output: {
            bundleId: ctx.input.bundleId,
            downloadUrl: result.urlToPass,
            passes: ctx.input.passIds
          },
          message: `Updated bundle \`${ctx.input.bundleId}\` with **${ctx.input.passIds.length}** pass(es).`
        };
      }
      case 'get': {
        if (!ctx.input.bundleId)
          throw new Error('bundleId is required for retrieving a bundle');
        let result = await client.getBundle(ctx.input.bundleId);
        let passes = result.data?.passes || result.passes || [];
        return {
          output: {
            bundleId: ctx.input.bundleId,
            passes
          },
          message: `Bundle \`${ctx.input.bundleId}\` contains **${passes.length}** pass(es).`
        };
      }
      case 'void':
      case 'unvoid': {
        if (!ctx.input.bundleId)
          throw new Error('bundleId is required for voiding/unvoiding a bundle');
        let voided = ctx.input.action === 'void';
        let result = await client.voidBundle(ctx.input.bundleId, voided);
        let passes = result.data?.passes || result.passes || [];
        return {
          output: {
            bundleId: ctx.input.bundleId,
            passes
          },
          message: `${voided ? 'Voided' : 'Unvoided'} all passes in bundle \`${ctx.input.bundleId}\`.`
        };
      }
      case 'delete': {
        if (!ctx.input.bundleId) throw new Error('bundleId is required for deleting a bundle');
        await client.deleteBundle(ctx.input.bundleId);
        return {
          output: { bundleId: ctx.input.bundleId },
          message: `Deleted bundle \`${ctx.input.bundleId}\` (passes are preserved).`
        };
      }
    }
  })
  .build();
