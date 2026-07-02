import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTagsTool = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, create, or delete tags in a repository.
Use action "list" to browse tags, "create" to create a new tag at a specific commit, or "delete" to remove a tag.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      tagName: z.string().optional().describe('Tag name (required for create/delete)'),
      target: z.string().optional().describe('Commit hash to tag (required for create)'),
      message: z
        .string()
        .optional()
        .describe('Tag message (for annotated tags, used with create)'),
      query: z.string().optional().describe('Filter query for listing'),
      sort: z.string().optional().describe('Sort field for listing'),
      page: z.number().optional().describe('Page number for listing'),
      pageLen: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            name: z.string(),
            targetHash: z.string().optional(),
            targetMessage: z.string().optional(),
            targetDate: z.string().optional()
          })
        )
        .optional(),
      createdTag: z
        .object({
          name: z.string(),
          targetHash: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list') {
      let result = await client.listTags(ctx.input.repoSlug, {
        query: ctx.input.query,
        sort: ctx.input.sort,
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      });

      let tags = (result.values || []).map((t: any) => ({
        name: t.name,
        targetHash: t.target?.hash || undefined,
        targetMessage: t.target?.message || undefined,
        targetDate: t.target?.date || undefined
      }));

      return {
        output: { tags, hasNextPage: !!result.next },
        message: `Found **${tags.length}** tags.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.tagName || !ctx.input.target) {
        throw bitbucketServiceError('tagName and target are required to create a tag');
      }

      let body: Record<string, any> = {
        name: ctx.input.tagName,
        target: { hash: ctx.input.target }
      };
      if (ctx.input.message) body.message = ctx.input.message;

      let tag = await client.createTag(ctx.input.repoSlug, body);

      return {
        output: {
          createdTag: {
            name: tag.name,
            targetHash: tag.target?.hash || undefined
          }
        },
        message: `Created tag **${tag.name}**.`
      };
    }

    // delete
    if (!ctx.input.tagName) {
      throw bitbucketServiceError('tagName is required to delete a tag');
    }

    await client.deleteTag(ctx.input.repoSlug, ctx.input.tagName);

    return {
      output: { deleted: true },
      message: `Deleted tag **${ctx.input.tagName}**.`
    };
  })
  .build();
