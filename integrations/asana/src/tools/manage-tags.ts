import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all tags in a workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID'),
      limit: z.number().optional().describe('Maximum number of tags to return')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagId: z.string(),
          name: z.string(),
          color: z.string().nullable().optional(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTags(ctx.input.workspaceId, { limit: ctx.input.limit });
    let tagList = (result.data || []).map((t: any) => ({
      tagId: t.gid,
      name: t.name,
      color: t.color,
      createdAt: t.created_at
    }));

    return {
      output: { tags: tagList },
      message: `Found **${tagList.length}** tag(s).`
    };
  })
  .build();

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag in a workspace.`
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID'),
      name: z.string().describe('Tag name'),
      color: z
        .string()
        .optional()
        .describe('Tag color (e.g., "dark-green", "dark-red", "light-blue")')
    })
  )
  .output(
    z.object({
      tagId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tag = await client.createTag(ctx.input.workspaceId, ctx.input.name, ctx.input.color);

    return {
      output: {
        tagId: tag.gid,
        name: tag.name
      },
      message: `Created tag **${tag.name}** (${tag.gid}).`
    };
  })
  .build();
