import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new tag to categorize content in the workspace. Tags have a name and a hex color for visual identification.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the tag'),
      hexColor: z.string().describe('Hex color code for the tag (e.g. "#38bdf8")')
    })
  )
  .output(
    z.object({
      tagId: z.number().optional().describe('Numeric ID of the created tag'),
      tagUuid: z.string().optional().describe('UUID of the created tag'),
      name: z.string().optional().describe('Name of the created tag'),
      hexColor: z.string().optional().describe('Hex color of the created tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.createTag({
      name: ctx.input.name,
      hex_color: ctx.input.hexColor
    });

    return {
      output: {
        tagId: result?.id,
        tagUuid: result?.uuid,
        name: result?.name,
        hexColor: result?.hex_color
      },
      message: `Tag **${ctx.input.name}** created successfully.`
    };
  })
  .build();
