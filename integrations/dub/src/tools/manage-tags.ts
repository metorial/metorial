import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, update, delete, or list tags used to categorize and organize links. Tags have a name and a color. Use the \`action\` field to specify what operation to perform.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list'])
        .describe('The operation to perform'),
      tagId: z.string().optional().describe('Tag ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create, optional for update)'),
      color: z
        .enum(['red', 'yellow', 'green', 'blue', 'purple', 'brown', 'gray', 'pink'])
        .optional()
        .describe('Tag color'),
      search: z.string().optional().describe('Search term for listing tags'),
      page: z.number().optional().describe('Page number for listing'),
      pageSize: z.number().optional().describe('Items per page for listing (max 100)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            name: z.string(),
            color: z.string()
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      tag: z
        .object({
          tagId: z.string(),
          name: z.string(),
          color: z.string()
        })
        .optional()
        .describe('Created/updated tag'),
      deletedTagId: z.string().optional().describe('ID of deleted tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let tags = await client.listTags({
        search: ctx.input.search,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });

      return {
        output: {
          tags: tags.map(t => ({ tagId: t.id, name: t.name, color: t.color }))
        },
        message: `Found **${tags.length}** tags`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating a tag');
      let tag = await client.createTag({ name: ctx.input.name, color: ctx.input.color });

      return {
        output: {
          tag: { tagId: tag.id, name: tag.name, color: tag.color }
        },
        message: `Created tag **${tag.name}** (${tag.color})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tagId) throw new Error('tagId is required for updating a tag');
      let tag = await client.updateTag(ctx.input.tagId, {
        name: ctx.input.name,
        color: ctx.input.color
      });

      return {
        output: {
          tag: { tagId: tag.id, name: tag.name, color: tag.color }
        },
        message: `Updated tag **${tag.name}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagId) throw new Error('tagId is required for deleting a tag');
      let result = await client.deleteTag(ctx.input.tagId);

      return {
        output: {
          deletedTagId: result.id
        },
        message: `Deleted tag \`${result.id}\``
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
