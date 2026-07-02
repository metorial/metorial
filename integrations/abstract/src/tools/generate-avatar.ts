import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let generateAvatar = SlateTool.create(spec, {
  name: 'Generate Avatar',
  key: 'generate_avatar',
  description: `Generates a user avatar image from a name. Creates initials-based avatars with customizable colors, sizes, and fonts. Useful for default profile pictures.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name to generate initials from (e.g. "John Doe")'),
      imageSize: z
        .number()
        .optional()
        .describe('Size of the avatar image in pixels (e.g. 200 for 200x200)'),
      fontSize: z.number().optional().describe('Font size for the initials in pixels'),
      charLimit: z
        .number()
        .optional()
        .describe('Maximum number of initials to display (e.g. 2 for "JD")'),
      background: z
        .string()
        .optional()
        .describe('Background color hex code without # (e.g. "4A90D9")'),
      fontColor: z
        .string()
        .optional()
        .describe('Font color hex code without # (e.g. "FFFFFF")')
    })
  )
  .output(
    z.object({
      name: z.string().describe('The name used to generate the avatar'),
      avatarUrl: z.string().optional().describe('URL of the generated avatar image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.generateAvatar({
      name: ctx.input.name,
      imageSize: ctx.input.imageSize,
      fontSize: ctx.input.fontSize,
      charLimit: ctx.input.charLimit,
      background: ctx.input.background,
      fontColor: ctx.input.fontColor
    });

    let avatarUrl =
      result?.url ?? result?.avatar_url ?? (typeof result === 'string' ? result : undefined);

    return {
      output: {
        name: ctx.input.name,
        avatarUrl
      },
      message: `Generated avatar for **${ctx.input.name}**${avatarUrl ? `: [View avatar](${avatarUrl})` : ''}.`
    };
  })
  .build();
