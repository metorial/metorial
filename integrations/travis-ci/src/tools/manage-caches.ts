import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let manageCaches = SlateTool.create(spec, {
  name: 'Manage Build Caches',
  key: 'manage_caches',
  description: `List or delete build caches for a repository. Caches store dependencies and artifacts to speed up builds. Can be filtered by branch or name pattern.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug (e.g. "owner/repo") or numeric ID.'),
      action: z.enum(['list', 'delete']).describe('Whether to list or delete caches.'),
      branch: z.string().optional().describe('Filter caches by branch name.'),
      match: z.string().optional().describe('Filter caches by name pattern.')
    })
  )
  .output(
    z.object({
      caches: z
        .array(
          z.object({
            slug: z.string().optional().describe('Cache slug'),
            branch: z.string().optional().describe('Branch name'),
            size: z.number().optional().describe('Cache size in bytes'),
            lastModified: z.string().optional().describe('Last modification timestamp')
          })
        )
        .optional()
        .describe('List of caches (for list action)'),
      deleted: z.boolean().optional().describe('Whether caches were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.action === 'delete') {
      await client.deleteCaches(ctx.input.repoSlugOrId, {
        branch: ctx.input.branch,
        match: ctx.input.match
      });
      return {
        output: { deleted: true },
        message: `Deleted caches for **${ctx.input.repoSlugOrId}**${ctx.input.branch ? ` on branch **${ctx.input.branch}**` : ''}.`
      };
    }

    let result = await client.listCaches(ctx.input.repoSlugOrId, {
      branch: ctx.input.branch,
      match: ctx.input.match
    });

    let caches = (result.caches || []).map((cache: any) => ({
      slug: cache.slug,
      branch: cache.branch,
      size: cache.size,
      lastModified: cache.last_modified
    }));

    return {
      output: { caches },
      message: `Found **${caches.length}** caches for **${ctx.input.repoSlugOrId}**.`
    };
  })
  .build();
