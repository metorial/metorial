import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

let cacheSchema = z.object({
  cacheId: z.number().describe('Cache ID'),
  ref: z.string().optional().describe('Git ref for the cache'),
  key: z.string().describe('Cache key'),
  version: z.string().optional().describe('Cache version'),
  lastAccessedAt: z.string().optional().describe('Last access timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  sizeInBytes: z.number().optional().describe('Cache size in bytes')
});

export let manageCaches = SlateTool.create(spec, {
  name: 'Manage Caches',
  key: 'manage_caches',
  description: `List, inspect, and delete GitHub Actions caches for a repository. Caches can be filtered by key prefix and git ref. Supports deleting by cache ID or cache key.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      action: z.enum(['list', 'delete_by_id', 'delete_by_key']).describe('Action to perform'),
      cacheId: z.number().optional().describe('Cache ID for delete_by_id'),
      key: z
        .string()
        .optional()
        .describe('Cache key for filtering (list) or deleting (delete_by_key)'),
      ref: z.string().optional().describe('Git ref to filter by'),
      sort: z
        .enum(['created_at', 'last_accessed_at', 'size_in_bytes'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Results per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      caches: z.array(cacheSchema).optional().describe('List of caches'),
      totalCount: z.number().optional().describe('Total number of caches'),
      deleted: z.boolean().optional().describe('Whether the cache(s) were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, action, cacheId, key, ref, sort, direction, perPage, page } = ctx.input;

    if (action === 'delete_by_id') {
      if (!cacheId) throw new Error('cacheId is required for delete_by_id.');
      await client.deleteCacheById(owner, repo, cacheId);
      return {
        output: { deleted: true },
        message: `Deleted cache **${cacheId}** from **${owner}/${repo}**.`
      };
    }

    if (action === 'delete_by_key') {
      if (!key) throw new Error('key is required for delete_by_key.');
      await client.deleteCacheByKey(owner, repo, key, ref);
      return {
        output: { deleted: true },
        message: `Deleted caches matching key **${key}** from **${owner}/${repo}**.`
      };
    }

    let data = await client.listCaches(owner, repo, {
      perPage,
      page,
      ref,
      key,
      sort,
      direction
    });
    let caches = (data.actions_caches ?? []).map((c: any) => ({
      cacheId: c.id,
      ref: c.ref,
      key: c.key,
      version: c.version,
      lastAccessedAt: c.last_accessed_at,
      createdAt: c.created_at,
      sizeInBytes: c.size_in_bytes
    }));

    return {
      output: { caches, totalCount: data.total_count },
      message: `Found **${data.total_count}** caches in **${owner}/${repo}**.`
    };
  })
  .build();
