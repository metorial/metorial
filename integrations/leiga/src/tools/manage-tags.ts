import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      projectId: z.number().describe('The project ID')
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
      projectId: z.number().describe('The project ID'),
      name: z.string().describe('Tag name'),
      color: z.string().optional().describe('Tag color (hex code, e.g. "#FF5733")')
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

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to create tag');
    }

    return {
      output: { success: true, raw: response.data },
      message: `Created tag **"${ctx.input.name}"**.`
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

    let response = await client.deleteTag(ctx.input.tagId);

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to delete tag');
    }

    return {
      output: { success: true },
      message: `Deleted tag **#${ctx.input.tagId}**.`
    };
  })
  .build();
