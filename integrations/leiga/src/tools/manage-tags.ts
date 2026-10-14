import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTagsTool = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in a project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema
    })
  )
  .output(
    z.object({
      tags: z.array(z.any()).describe('List of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listTags(ctx.input.projectId);

    let tagList = response.data || [];

    return {
      output: { tags: tagList },
      message: `Found **${tagList.length}** tag(s).`
    };
  })
  .build();

export let createTagTool = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag in a project for labeling issues.`
})
  .input(
    z.object({
      projectId: projectIdSchema,
      name: z.string().min(1).max(20).describe('Tag name, 1 to 20 characters'),
      color: z
        .string()
        .optional()
        .describe('Legacy color input. Leiga does not document tag colors; omit this field.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tag was created'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createTag({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      color: ctx.input.color
    });

    return {
      output: { success: true, raw: response.data },
      message: `Created tag **"${ctx.input.name}"**.`
    };
  })
  .build();

export let updateTagTool = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: 'Rename a project tag. Call list_tags to discover tag IDs.'
})
  .input(
    z.object({
      tagId: z.number().describe('Tag ID from list_tags'),
      name: z.string().min(1).max(20).describe('New tag name, 1 to 20 characters')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tag was renamed'),
      tagId: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.updateTag({ tagId: ctx.input.tagId, name: ctx.input.name });
    return {
      output: { success: true, tagId: ctx.input.tagId },
      message: `Renamed tag #${ctx.input.tagId} to **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteTagTool = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a tag from a project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tagId: z.number().describe('The tag ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTag(ctx.input.tagId);

    return {
      output: { success: true },
      message: `Deleted tag **#${ctx.input.tagId}**.`
    };
  })
  .build();
