import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, update, delete, and list tags. Tags are used to organize and segment subscribers for targeted campaigns and automation triggers.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      tagId: z.number().optional().describe('Tag ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Unique tag ID'),
            name: z.string().describe('Tag name'),
            createdAt: z.string().describe('When the tag was created')
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      tag: z
        .object({
          tagId: z.number().describe('Unique tag ID'),
          name: z.string().describe('Tag name'),
          createdAt: z.string().describe('When the tag was created')
        })
        .optional()
        .describe('Created or updated tag'),
      deleted: z.boolean().optional().describe('Whether the tag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTags();
      let tags = result.data.map(t => ({
        tagId: t.id,
        name: t.name,
        createdAt: t.created_at
      }));
      return {
        output: { tags },
        message: `Found **${tags.length}** tags.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw kitServiceError('Tag name is required for create');
      }
      let data = await client.createTag(ctx.input.name);
      return {
        output: {
          tag: {
            tagId: data.tag.id,
            name: data.tag.name,
            createdAt: data.tag.created_at
          }
        },
        message: `Created tag **${data.tag.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tagId) {
        throw kitServiceError('Tag ID is required for update');
      }
      if (!ctx.input.name) {
        throw kitServiceError('Tag name is required for update');
      }
      let data = await client.updateTag(ctx.input.tagId, ctx.input.name);
      return {
        output: {
          tag: {
            tagId: data.tag.id,
            name: data.tag.name,
            createdAt: data.tag.created_at
          }
        },
        message: `Updated tag to **${data.tag.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagId) {
        throw kitServiceError('Tag ID is required for delete');
      }
      await client.deleteTag(ctx.input.tagId);
      return {
        output: { deleted: true },
        message: `Deleted tag \`${ctx.input.tagId}\`.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
