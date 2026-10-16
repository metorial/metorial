import { SlateTool } from 'slates';
import { z } from 'zod';
import { bannerOutputSchema, mapBanner } from '../lib/banner';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate a single image synchronously from a design template. Override element properties (text, colors, images) and specify a format. Returns the generated image URL immediately. Only works with **static** design types.`,
  instructions: [
    'Use the "Get Design Format" tool first to inspect available elements and format names for a design.',
    'Element overrides are keyed by layer name. Each element can have properties like `payload` (text), `color` (hex), `image_url`, `font_size`, etc.'
  ],
  constraints: ['Only works with static design types.', 'Rate limited to 5 requests/second.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      designId: z.string().describe('UUID of the design to generate from'),
      templateFormatName: z
        .string()
        .describe(
          'Format name as defined in the design (e.g., "facebook-feed", "instagram-post")'
        ),
      elements: z
        .record(z.string(), z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Element overrides keyed by layer name. Each value is an object with element properties like payload, color, image_url, etc.'
        ),
      imageFileType: z
        .enum(['png', 'jpeg', 'webp', 'avif', 'pdf', 'auto'])
        .optional()
        .describe(
          'Override default output file type. Default: PNG for transparent backgrounds, JPEG for opaque.'
        ),
      fileCompressionLevel: z
        .number()
        .optional()
        .describe('Output quality from 1 to 100; 100 is best quality.'),
      originalVisualId: z
        .string()
        .optional()
        .describe('Existing visual ID to regenerate in place, preserving its share URL.')
    })
  )
  .output(bannerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.generateSingleImage(ctx.input.designId, {
      templateFormatName: ctx.input.templateFormatName,
      elements: ctx.input.elements,
      imageFileType: ctx.input.imageFileType,
      fileCompressionLevel: ctx.input.fileCompressionLevel,
      originalVisualId: ctx.input.originalVisualId
    });

    await ctx.addAttachment({
      type: 'url',
      url: result.file.url,
      filename: result.file.filename
    });

    return {
      output: mapBanner(result),
      message: `Generated ${result.file.type.toUpperCase()} file with ID \`${result.id}\`.`
    };
  })
  .build();
