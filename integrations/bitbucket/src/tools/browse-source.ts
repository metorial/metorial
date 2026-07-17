import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let browseSourceTool = SlateTool.create(spec, {
  name: 'Browse Source',
  key: 'browse_source',
  description: `Browse repository source files at a specific revision (branch, tag, or commit hash).
Returns directory listings or file contents depending on the path.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      revision: z
        .string()
        .optional()
        .describe('Branch name, tag, or commit hash. Defaults to the repository main branch.'),
      at: z
        .string()
        .optional()
        .describe('Legacy alias for revision, used only when revision is omitted.'),
      path: z
        .string()
        .optional()
        .describe(
          'File or directory path (e.g. "src/index.ts"). Leave empty for the root directory.'
        )
    })
  )
  .output(
    z.object({
      type: z.enum(['file', 'directory']),
      path: z.string(),
      content: z.string().optional(),
      size: z.number().optional(),
      entries: z
        .array(
          z.object({
            path: z.string(),
            type: z.string(),
            size: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });
    let path = ctx.input.path || '';
    let revision = ctx.input.revision?.trim() || ctx.input.at?.trim();

    if (!revision) {
      let repository = await client.getRepository(ctx.input.repoSlug);
      revision = repository.mainbranch?.name;
    }

    if (!revision) {
      throw bitbucketServiceError(
        'The repository has no main branch. Provide a branch, tag, or commit hash in revision.'
      );
    }

    let result = await client.getSource(ctx.input.repoSlug, {
      revision,
      path
    });

    // If it's a paginated response with values, it's a directory listing
    if (result && typeof result === 'object' && 'values' in result) {
      let entries = (result.values || []).map((e: any) => ({
        path: e.path,
        type: e.type,
        size: e.size || undefined
      }));

      return {
        output: {
          type: 'directory' as const,
          path: path || '/',
          entries
        },
        message: `Directory **${path || '/'}** at ${revision}: **${entries.length}** entries.`
      };
    }

    // Otherwise it's file content
    let content = typeof result === 'string' ? result : JSON.stringify(result);

    return {
      output: {
        type: 'file' as const,
        path,
        content,
        size: content.length
      },
      message: `File **${path}** at ${revision}: ${content.length} bytes.`
    };
  })
  .build();
