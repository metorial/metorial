import { createApiServiceError, SlateTool } from 'slates';
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
    destructive: true,
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
      deleted: z
        .boolean()
        .optional()
        .describe('Whether deletion is confirmed complete; false while the request is queued'),
      deletionStarted: z
        .boolean()
        .optional()
        .describe('Whether cache deletion was accepted for asynchronous processing'),
      cacheIds: z.array(z.string()).optional().describe('Cache IDs scheduled for deletion')
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
      let result = await client.deleteAllCaches(ctx.input.appId);
      return {
        output: { deleted: false, deletionStarted: true, cacheIds: result.caches },
        message: `Cache deletion was queued for app \`${ctx.input.appId}\`. Completion is asynchronous.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.cacheId) {
        throw createApiServiceError(
          'cacheId is required for the delete action. Use the list action to discover cache IDs.'
        );
      }
      let result = await client.deleteCache(ctx.input.appId, ctx.input.cacheId);
      return {
        output: { deleted: false, deletionStarted: true, cacheIds: result.caches },
        message: `Deletion was queued for cache \`${ctx.input.cacheId}\`. Completion is asynchronous.`
      };
    }

    throw createApiServiceError(`Unknown cache action: ${ctx.input.action}`);
  })
  .build();
