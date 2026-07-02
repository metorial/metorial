import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getSpaceTags = SlateTool.create(spec, {
  name: 'Get Space Tags',
  key: 'get_space_tags',
  description: `Retrieve all tags defined in a ClickUp space.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to get tags from')
    })
  )
  .output(
    z.object({
      tags: z.array(
        z.object({
          tagName: z.string(),
          tagFg: z.string().optional(),
          tagBg: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let tagList = await client.getSpaceTags(ctx.input.spaceId);

    return {
      output: {
        tags: (tagList ?? []).map((t: any) => ({
          tagName: t.name,
          tagFg: t.tag_fg,
          tagBg: t.tag_bg
        }))
      },
      message: `Found **${(tagList ?? []).length}** tag(s) in space ${ctx.input.spaceId}.`
    };
  })
  .build();

export let createSpaceTag = SlateTool.create(spec, {
  name: 'Create Space Tag',
  key: 'create_space_tag',
  description: `Create a new tag in a ClickUp space. Tags can then be applied to tasks.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to create the tag in'),
      tagName: z.string().describe('Name of the tag'),
      tagForegroundColor: z.string().optional().describe('Foreground color hex code'),
      tagBackgroundColor: z.string().optional().describe('Background color hex code')
    })
  )
  .output(
    z.object({
      created: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.createSpaceTag(ctx.input.spaceId, {
      name: ctx.input.tagName,
      tagFg: ctx.input.tagForegroundColor,
      tagBg: ctx.input.tagBackgroundColor
    });

    return {
      output: { created: true },
      message: `Created tag **${ctx.input.tagName}** in space ${ctx.input.spaceId}.`
    };
  })
  .build();
