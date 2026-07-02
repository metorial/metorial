import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, create, update, or delete tags. Tags are used to categorize and organize conversations. Use "list" to see all tags, or create/update/delete individual tags.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      tagId: z.number().optional().describe('Tag ID (required for update and delete)'),
      name: z.string().optional().describe('Tag name (required for create and update)'),
      page: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            color: z.string().nullable().optional().describe('Tag color'),
            ticketCount: z
              .number()
              .optional()
              .describe('Number of conversations with this tag'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of tags (for list action)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let data = await client.listTags({ page: ctx.input.page });
      let embedded = data?._embedded?.tags ?? [];
      let tags = embedded.map((t: any) => ({
        tagId: t.id,
        name: t.name ?? t.tag,
        color: t.color ?? null,
        ticketCount: t.ticketCount,
        createdAt: t.createdAt
      }));

      return {
        output: { tags, success: true },
        message: `Found **${tags.length}** tags.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name)
        throw helpscoutServiceError('Tag name is required for create action');
      await client.createTag(ctx.input.name);
      return {
        output: { success: true },
        message: `Created tag **"${ctx.input.name}"**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tagId)
        throw helpscoutServiceError('Tag ID is required for update action');
      if (!ctx.input.name)
        throw helpscoutServiceError('Tag name is required for update action');
      await client.updateTag(ctx.input.tagId, ctx.input.name);
      return {
        output: { success: true },
        message: `Updated tag **#${ctx.input.tagId}** to "${ctx.input.name}".`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagId)
        throw helpscoutServiceError('Tag ID is required for delete action');
      await client.deleteTag(ctx.input.tagId);
      return {
        output: { success: true },
        message: `Deleted tag **#${ctx.input.tagId}**.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
