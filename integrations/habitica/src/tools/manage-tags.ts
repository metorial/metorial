import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, list, update, or delete tags used to organize and filter tasks in Habitica. Tags can be applied to any task type.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      tagId: z.string().optional().describe('Tag ID (required for update and delete)'),
      name: z.string().optional().describe('Tag name (required for create and update)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().describe('Tag name')
          })
        )
        .describe('Tag(s) returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let mapTag = (t: Record<string, any>) => ({
      tagId: t.id || t._id,
      name: t.name
    });

    if (ctx.input.action === 'list') {
      let tagsList = await client.getTags();
      return {
        output: { tags: tagsList.map(mapTag) },
        message: `Retrieved **${tagsList.length}** tag(s)`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let tag = await client.createTag(ctx.input.name);
      return {
        output: { tags: [mapTag(tag)] },
        message: `Created tag **${tag.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tagId) throw new Error('tagId is required for update action');
      if (!ctx.input.name) throw new Error('name is required for update action');
      let tag = await client.updateTag(ctx.input.tagId, ctx.input.name);
      return {
        output: { tags: [mapTag(tag)] },
        message: `Updated tag to **${tag.name}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagId) throw new Error('tagId is required for delete action');
      await client.deleteTag(ctx.input.tagId);
      return {
        output: { tags: [] },
        message: `Deleted tag **${ctx.input.tagId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
