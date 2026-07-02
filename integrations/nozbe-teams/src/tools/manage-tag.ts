import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create or update a tag in Nozbe Teams. Tags categorize tasks by context, place, or tool. Configure with custom name, color, and icon. Set teamId to make a tag public (visible to all space members) or leave null for private.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tagId: z.string().optional().describe('Tag ID to update. Omit to create a new tag.'),
      name: z.string().optional().describe('Tag name (required when creating)'),
      teamId: z
        .string()
        .nullable()
        .optional()
        .describe('Team ID for public tags, null for private'),
      color: z.string().nullable().optional().describe('Tag color'),
      icon: z.string().nullable().optional().describe('Tag icon identifier'),
      isFavorite: z.boolean().optional().describe('Whether to favorite the tag')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('Tag ID'),
      name: z.string().describe('Tag name'),
      teamId: z.string().nullable().optional().describe('Team ID'),
      color: z.string().nullable().optional().describe('Tag color'),
      icon: z.string().nullable().optional().describe('Tag icon')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.teamId !== undefined) data.team_id = ctx.input.teamId;
    if (ctx.input.color !== undefined) data.color = ctx.input.color;
    if (ctx.input.icon !== undefined) data.icon = ctx.input.icon;
    if (ctx.input.isFavorite !== undefined) data.is_favorite = ctx.input.isFavorite;

    let tag: any;
    if (ctx.input.tagId) {
      tag = await client.updateTag(ctx.input.tagId, data);
    } else {
      tag = await client.createTag(data);
    }

    let action = ctx.input.tagId ? 'Updated' : 'Created';

    return {
      output: {
        tagId: tag.id,
        name: tag.name,
        teamId: tag.team_id,
        color: tag.color,
        icon: tag.icon
      },
      message: `${action} tag **${tag.name}** (ID: ${tag.id}).`
    };
  })
  .build();
