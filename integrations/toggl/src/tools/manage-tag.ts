import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create, update, or delete a tag in Toggl Track. Tags are used to label time entries for cross-project filtering and categorization.
To **create**: provide a name. To **update**: provide a tagId and a new name. To **delete**: provide a tagId and set \`delete\` to true.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the tag'),
      name: z.string().optional().describe('Tag name (required for create and update)')
    })
  )
  .output(
    z.object({
      tag: z
        .object({
          tagId: z.number().describe('Tag ID'),
          name: z.string().describe('Tag name'),
          workspaceId: z.number().describe('Workspace ID')
        })
        .nullable()
        .describe('The created/updated tag, null if deleted'),
      deleted: z.boolean().describe('Whether a tag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    if (ctx.input.delete && ctx.input.tagId) {
      await client.deleteTag(wsId, ctx.input.tagId);
      return {
        output: { tag: null, deleted: true },
        message: `Deleted tag **#${ctx.input.tagId}**`
      };
    }

    let result: any;
    if (ctx.input.tagId) {
      if (!ctx.input.name) throw new Error('Tag name is required when updating a tag.');
      result = await client.updateTag(wsId, ctx.input.tagId, { name: ctx.input.name });
    } else {
      if (!ctx.input.name) throw new Error('Tag name is required when creating a tag.');
      result = await client.createTag(wsId, { name: ctx.input.name });
    }

    return {
      output: {
        tag: {
          tagId: result.id,
          name: result.name,
          workspaceId: result.workspace_id ?? result.wid
        },
        deleted: false
      },
      message: ctx.input.tagId
        ? `Updated tag to **${result.name}**`
        : `Created tag **${result.name}**`
    };
  })
  .build();
