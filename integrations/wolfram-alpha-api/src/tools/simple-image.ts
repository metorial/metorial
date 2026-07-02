import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let simpleImage = SlateTool.create(spec, {
  name: 'Simple Image Result',
  key: 'simple_image',
  description: `Get a URL for the entire Wolfram Alpha result page rendered as a single image.
Useful for embedding visual results or sharing computed answers as images. Supports customization of layout, colors, font size, and image width.`,
  instructions: [
    'The returned URL can be used directly in image tags or shared as a link.',
    'Use background/foreground colors as hex values without the "#" prefix (e.g., "F5F5F5").'
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
      background: z.string().optional().describe('Background color as hex (e.g., "F5F5F5")'),
      foreground: z
        .string()
        .optional()
        .describe('Foreground/text color as hex (e.g., "000000")'),
      fontSize: z.number().optional().describe('Font size in points (default is 14)'),
      width: z.number().optional().describe('Image width in pixels (default is 500)'),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for the result'),
      timeout: z.number().optional().describe('Query timeout in seconds')
    })
  )
  .output(
    z.object({
      imageUrl: z.string().describe('URL of the rendered result image')
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

    return {
      output: {
        imageUrl
      },
      message: `Generated image result: [View Image](${imageUrl})`
    };
  })
  .build();
