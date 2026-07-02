import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let manageCaches = SlateTool.create(spec, {
  name: 'Manage Caches',
  key: 'manage_caches',
  description: `List, delete all, or delete a specific build cache for an application. Caches are associated with workflows and include metadata like size and last usage time.`,
  instructions: [
    'Set action to "list" to view all caches for an application.',
    'Set action to "delete_all" to remove all caches for an application.',
    'Set action to "delete" and provide a cacheId to delete a specific cache.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('Application ID'),
      action: z.enum(['list', 'delete_all', 'delete']).describe('Cache operation to perform'),
      cacheId: z
        .string()
        .optional()
        .describe('Cache ID to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      caches: z
        .array(
          z.object({
            cacheId: z.string().describe('Cache identifier'),
            appId: z.string().describe('Application ID'),
            workflowId: z.string().optional().describe('Associated workflow ID'),
            lastUsed: z.string().optional().describe('When the cache was last used'),
            size: z.number().optional().describe('Cache size in bytes')
          })
        )
        .optional()
        .describe('List of caches (returned for "list" action)'),
      deleted: z.boolean().optional().describe('Whether the delete operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let caches = await client.listCaches(ctx.input.appId);
      let output = {
        caches: caches.map(c => ({
          cacheId: c._id,
          appId: c.appId,
          workflowId: c.workflowId,
          lastUsed: c.lastUsed,
          size: c.size
        }))
      };
      return {
        output,
        message: `Found **${caches.length}** cache(s) for app \`${ctx.input.appId}\`.`
      };
    }

    if (ctx.input.action === 'delete_all') {
      await client.deleteAllCaches(ctx.input.appId);
      return {
        output: { deleted: true },
        message: `Deleted all caches for app \`${ctx.input.appId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.cacheId) {
        throw new Error('cacheId is required for delete action');
      }
      await client.deleteCache(ctx.input.appId, ctx.input.cacheId);
      return {
        output: { deleted: true },
        message: `Deleted cache \`${ctx.input.cacheId}\` for app \`${ctx.input.appId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
