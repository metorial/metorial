import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTagsTool = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in Airbyte. Tags can be used to organize and categorize resources. Optionally filter by workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceIds: z.array(z.string()).optional().describe('Filter tags by workspace IDs.')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string(),
          name: z.string(),
          color: z.string(),
          workspaceId: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTags({ workspaceIds: ctx.input.workspaceIds });

    return {
      output: {
        tags: result.data.map(t => ({
          tagId: t.tagId,
          name: t.name,
          color: t.color,
          workspaceId: t.workspaceId
        }))
      },
      message: `Found **${result.data.length}** tag(s).`
    };
  })
  .build();

export let createTagTool = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag in Airbyte for organizing and categorizing resources.`
})
  .input(
    z.object({
      name: z.string().describe('Display name for the tag.'),
      color: z.string().describe('Hexadecimal color value for the tag (e.g. "#FF5733").'),
      workspaceId: z.string().describe('UUID of the workspace to create the tag in.')
    })
  )
  .output(
    z.object({
      tagId: z.string(),
      name: z.string(),
      color: z.string(),
      workspaceId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let tag = await client.createTag({
      name: ctx.input.name,
      color: ctx.input.color,
      workspaceId: ctx.input.workspaceId
    });

    return {
      output: {
        tagId: tag.tagId,
        name: tag.name,
        color: tag.color,
        workspaceId: tag.workspaceId
      },
      message: `Created tag **${tag.name}** (ID: ${tag.tagId}).`
    };
  })
  .build();

export let updateTagTool = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Update an existing Airbyte tag's name or color.`
})
  .input(
    z.object({
      tagId: z.string().describe('The UUID of the tag to update.'),
      name: z.string().optional().describe('New name for the tag.'),
      color: z.string().optional().describe('New hexadecimal color value for the tag.')
    })
  )
  .output(
    z.object({
      tagId: z.string(),
      name: z.string(),
      color: z.string(),
      workspaceId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.color !== undefined) updateData.color = ctx.input.color;

    let tag = await client.updateTag(ctx.input.tagId, updateData);

    return {
      output: {
        tagId: tag.tagId,
        name: tag.name,
        color: tag.color,
        workspaceId: tag.workspaceId
      },
      message: `Updated tag **${tag.name}** (ID: ${tag.tagId}).`
    };
  })
  .build();

export let deleteTagTool = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Permanently delete an Airbyte tag. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tagId: z.string().describe('The UUID of the tag to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTag(ctx.input.tagId);

    return {
      output: { success: true },
      message: `Deleted tag ${ctx.input.tagId}.`
    };
  })
  .build();
