import { SlateTool } from 'slates';
import { z } from 'zod';
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
        .enum(['png', 'jpeg', 'webp', 'avif', 'pdf'])
        .optional()
        .describe(
          'Override default output file type. Default: PNG for transparent backgrounds, JPEG for opaque.'
        )
    })
  )
  .output(
    z.object({
      bannerId: z.string().describe('ID of the generated banner'),
      fileType: z.string().describe('Type of the generated file (jpeg, png, etc.)'),
      fileUrl: z.string().describe('URL where the generated image is stored'),
      cdnUrl: z.string().describe('CDN URL for high-speed access'),
      filename: z.string().describe('Generated filename'),
      formatName: z.string().describe('Format name used'),
      width: z.number().describe('Width of generated image in pixels'),
      height: z.number().describe('Height of generated image in pixels'),
      templateId: z.string().describe('Template UUID used for generation'),
      templateName: z.string().describe('Template name used for generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.generateSingleImage(ctx.input.designId, {
      templateFormatName: ctx.input.templateFormatName,
      elements: ctx.input.elements,
      imageFileType: ctx.input.imageFileType
    });

    return {
      output: {
        bannerId: result.id,
        fileType: result.file.type,
        fileUrl: result.file.url,
        cdnUrl: result.file.cdn_url,
        filename: result.file.filename,
        formatName: result.format.id,
        width: result.format.width,
        height: result.format.height,
        templateId: result.template.id,
        templateName: result.template.name
      },
      message: `Generated **${result.file.type.toUpperCase()}** image (${result.format.width}x${result.format.height}) from template **${result.template.name}** in format \`${result.format.id}\`. [CDN URL](${result.file.cdn_url})`
    };
  })
  .build();
