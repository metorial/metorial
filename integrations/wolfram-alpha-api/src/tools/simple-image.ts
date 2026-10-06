import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let simpleImage = SlateTool.create(spec, {
  name: 'Simple Image Result',
  key: 'simple_image',
  description: `Get a downloadable image of the entire Wolfram Alpha result page.
Useful for embedding visual results or sharing computed answers as images. Supports customization of layout, colors, font size, and image width.`,
  instructions: [
    'Use the downloadable image for embedding or sharing; imageUrl is a provider endpoint requiring your AppID.',
    'Background accepts HTML color names, hex RGB without "#", comma-separated RGB/RGBA, or transparent. Foreground accepts black or white.'
  ],
  constraints: ['Does not support disambiguation or interactive drilldown.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Natural language query to render as an image'),
      layout: z
        .enum(['divider', 'labelbar'])
        .optional()
        .describe('Layout style for the image'),
      background: z
        .string()
        .optional()
        .describe('Background color, e.g., white, F5F5F5, 0,100,200, or transparent'),
      foreground: z
        .string()
        .optional()
        .describe('Text color: black or white; 000000 and FFFFFF are accepted aliases'),
      fontSize: z.number().optional().describe('Font size in points (default is 14)'),
      width: z.number().optional().describe('Image width in pixels (default is 500)'),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for the result'),
      timeout: z.number().optional().describe('Query timeout in seconds')
    })
  )
  .output(
    z.object({
      imageUrl: z
        .string()
        .describe(
          'Provider image endpoint without credentials; use the downloadable image to view or share it'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let imageUrl = await client.simpleImage({
      input: ctx.input.query,
      layout: ctx.input.layout,
      background: ctx.input.background,
      foreground: ctx.input.foreground,
      fontsize: ctx.input.fontSize,
      width: ctx.input.width,
      units: ctx.input.units ?? ctx.config.unitSystem,
      timeout: ctx.input.timeout
    });

    await ctx.addAttachment({
      type: 'url',
      url: imageUrl,
      query: { appid: ctx.auth.token }
    });

    return {
      output: {
        imageUrl
      },
      message: 'Prepared the computed image for download.'
    };
  })
  .build();
