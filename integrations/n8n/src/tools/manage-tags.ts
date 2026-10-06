import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid } from '../lib/connection';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, update, delete, or list tags used to organize workflows and credentials. Specify an **action** to determine the operation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The tag operation to perform'),
      tagId: z.string().optional().describe('Tag ID (required for update and delete actions)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create and update actions)'),
      limit: z.number().optional().describe('Max results for list action'),
      cursor: z.string().optional().describe('Pagination cursor for list action')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      tag: z
        .object({
          tagId: z.string().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Single tag result (for create, update, get actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether deletion was successful (for delete action)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let mapTag = (t: Awaited<ReturnType<typeof client.getTag>>) => ({
      tagId: String(t.id),
      name: t.name || '',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listTags({
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let tags = (result.data || []).map(mapTag);
        return {
          output: { tags, nextCursor: result.nextCursor },
          message: `Found **${tags.length}** tag(s).`
        };
      }
      case 'get': {
        if (!ctx.input.tagId) throw invalid('tagId is required for reading a tag');
        return {
          output: { tag: mapTag(await client.getTag(ctx.input.tagId)) },
          message: 'Retrieved the exact native tag.'
        };
      }
      case 'create': {
        if (!ctx.input.name) throw invalid('Name is required for creating a tag');
        let tag = await client.createTag(ctx.input.name);
        return {
          output: { tag: mapTag(tag) },
          message: `Created tag **"${tag.name}"** (ID: ${tag.id}).`
        };
      }
      case 'update': {
        if (!ctx.input.tagId) throw invalid('tagId is required for updating a tag');
        if (!ctx.input.name) throw invalid('Name is required for updating a tag');
        let tag = await client.updateTag(ctx.input.tagId, ctx.input.name);
        return {
          output: { tag: mapTag(tag) },
          message: `Updated tag **${ctx.input.tagId}** to **"${ctx.input.name}"**.`
        };
      }
      case 'delete': {
        if (!ctx.input.tagId) throw invalid('tagId is required for deleting a tag');
        await client.deleteTag(ctx.input.tagId);
        return {
          output: { deleted: true },
          message: `Deleted tag **${ctx.input.tagId}**.`
        };
      }
    }
  })
  .build();
