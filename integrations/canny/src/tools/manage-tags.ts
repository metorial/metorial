import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let manageTagsTool = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, retrieve, or list tags on a board. Tags are labels that can be applied to posts for flexible categorization and filtering.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'retrieve', 'list']).describe('The action to perform'),
      boardId: z.string().optional().describe('Board ID (required for create and list)'),
      tagId: z.string().optional().describe('Tag ID (for retrieve)'),
      name: z.string().optional().describe('Tag name (for create)'),
      limit: z.number().optional().describe('Number of tags to return (for list)'),
      skip: z.number().optional().describe('Number to skip for pagination (for list)')
    })
  )
  .output(
    z.object({
      tag: z
        .object({
          tagId: z.string(),
          name: z.string(),
          postCount: z.number().optional(),
          boardId: z.string().optional(),
          url: z.string().optional(),
          created: z.string().optional()
        })
        .optional()
        .describe('Tag details (for create/retrieve)'),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            name: z.string(),
            postCount: z.number(),
            url: z.string(),
            created: z.string()
          })
        )
        .optional()
        .describe('List of tags (for list)'),
      hasMore: z.boolean().optional().describe('Whether more tags are available (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.boardId) throw new Error('boardId is required for create');
        if (!ctx.input.name) throw new Error('name is required for create');
        let result = await client.createTag({
          boardID: ctx.input.boardId,
          name: ctx.input.name
        });
        return {
          output: {
            tag: {
              tagId: result.id,
              name: result.name,
              postCount: result.postCount,
              boardId: result.board?.id,
              url: result.url,
              created: result.created
            }
          },
          message: `Created tag **"${ctx.input.name}"**.`
        };
      }

      case 'retrieve': {
        if (!ctx.input.tagId) throw new Error('tagId is required for retrieve');
        let tag = await client.retrieveTag(ctx.input.tagId);
        return {
          output: {
            tag: {
              tagId: tag.id,
              name: tag.name,
              postCount: tag.postCount,
              boardId: tag.board?.id,
              url: tag.url,
              created: tag.created
            }
          },
          message: `Retrieved tag **"${tag.name}"** with ${tag.postCount} post(s).`
        };
      }

      case 'list': {
        if (!ctx.input.boardId) throw new Error('boardId is required for list');
        let result = await client.listTags({
          boardID: ctx.input.boardId,
          limit: ctx.input.limit,
          skip: ctx.input.skip
        });
        let tags = (result.tags || []).map((t: any) => ({
          tagId: t.id,
          name: t.name,
          postCount: t.postCount,
          url: t.url,
          created: t.created
        }));
        return {
          output: { tags, hasMore: result.hasMore },
          message: `Found **${tags.length}** tag(s)${result.hasMore ? ' (more available)' : ''}.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
