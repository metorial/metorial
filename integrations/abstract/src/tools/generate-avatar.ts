import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let generateAvatar = SlateTool.create(spec, {
  name: 'Generate Avatar',
  key: 'generate_avatar',
  description: `Generates a user avatar image from a name. Creates initials-based avatars with customizable colors, sizes, and fonts. Useful for default profile pictures.`,
  instructions: [
    'Use fontScale for a font size expressed as a fraction of the image size. The legacy fontSize input is forwarded unchanged for compatibility.'
  ],
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
      imageFormat: z
        .enum(['png', 'svg'])
        .optional()
        .describe('Avatar format; defaults to PNG'),
      isRounded: z
        .boolean()
        .optional()
        .describe('Generate a rounded avatar instead of a square'),
      fontScale: z
        .number()
        .optional()
        .describe(
          'Font size as a fraction of image size, between 0.1 and 1.0. Overrides fontSize.'
        ),
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
    if (
      ctx.input.fontScale !== undefined &&
      (ctx.input.fontScale < 0.1 || ctx.input.fontScale > 1)
    )
      throw createApiServiceError('fontScale must be between 0.1 and 1.0.');
    let client = new AbstractClient(ctx.auth);

    let result = await client.generateAvatar({
      name: ctx.input.name,
      imageSize: ctx.input.imageSize,
      fontSize: ctx.input.fontScale ?? ctx.input.fontSize,
      charLimit: ctx.input.charLimit,
      background: ctx.input.background,
      fontColor: ctx.input.fontColor,
      imageFormat: ctx.input.imageFormat,
      isRounded: ctx.input.isRounded
    });

    let avatarUrl =
      result?.url ?? result?.avatar_url ?? (typeof result === 'string' ? result : undefined);

    let query: Record<string, string> = { name: ctx.input.name };
    if (ctx.input.imageSize !== undefined) query.image_size = String(ctx.input.imageSize);
    if ((ctx.input.fontScale ?? ctx.input.fontSize) !== undefined)
      query.font_size = String(ctx.input.fontScale ?? ctx.input.fontSize);
    if (ctx.input.charLimit !== undefined) query.char_limit = String(ctx.input.charLimit);
    if (ctx.input.background !== undefined) query.background_color = ctx.input.background;
    if (ctx.input.fontColor !== undefined) query.font_color = ctx.input.fontColor;
    if (ctx.input.imageFormat !== undefined) query.image_format = ctx.input.imageFormat;
    if (ctx.input.isRounded !== undefined) query.is_rounded = String(ctx.input.isRounded);
    await ctx.addAttachment({
      type: 'url',
      ...client.fileRequest('avatars', query),
      mimeType: ctx.input.imageFormat === 'svg' ? 'image/svg+xml' : 'image/png'
    });

    return {
      output: {
        name: ctx.input.name,
        avatarUrl
      },
      message: `Generated avatar for **${ctx.input.name}**. An avatar image is available to download.`
    };
  })
  .build();
