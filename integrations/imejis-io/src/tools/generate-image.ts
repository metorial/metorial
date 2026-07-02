import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImejisClient } from '../lib/client';
import { spec } from '../spec';

export let generateImageTool = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate a custom image from a pre-designed Imejis.io template by providing dynamic overrides for text, colors, images, and other component properties.
Renders a design template with the given overrides and returns either a URL to the generated image or the image as base64-encoded binary data.
Overrides can use **nested objects** (e.g. \`{ "title": { "text": "Hello", "color": "#ff0000" } }\`) or **dot notation** (e.g. \`{ "title.text": "Hello", "title.color": "#ff0000" }\`), or a combination of both.
Only send properties you want to change; unspecified properties retain their template defaults.`,
  instructions: [
    'You need a designId from the Imejis.io platform — create or select a design at https://app.imejis.io and note its unique ID.',
    'Component names in overrides must match the component names defined in the design template.',
    'Supported override properties per component include: text, color, backgroundColor, textBackgroundColor, borderColor, strokeColor, image, opacity, and more depending on component type.',
    'Use responseFormat "url" to get a hosted image URL, or "binary" to get base64-encoded PNG data.'
  ],
  constraints: [
    'Image generation is a paid operation — each render consumes API credits.',
    'The design template must exist and be accessible with your API key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      designId: z
        .string()
        .describe('The unique ID of the Imejis.io design template to render.'),
      overrides: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs to override template component properties. Supports nested objects, dot notation keys, or both.'
        ),
      responseFormat: z
        .enum(['url', 'binary'])
        .default('url')
        .describe('Whether to return a hosted image URL or base64-encoded binary image data.')
    })
  )
  .output(
    z.object({
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the generated image (when responseFormat is "url").'),
      imageBase64: z
        .string()
        .optional()
        .describe('Base64-encoded image data (when responseFormat is "binary").'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the generated image (when responseFormat is "binary").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImejisClient({ token: ctx.auth.token });

    if (ctx.input.responseFormat === 'binary') {
      let result = await client.generateImageBinary(ctx.input.designId, ctx.input.overrides);
      return {
        output: {
          imageBase64: result.imageBase64,
          contentType: result.contentType
        },
        message: `Generated image from design \`${ctx.input.designId}\` as binary data (${result.contentType}).`
      };
    }

    let result = await client.generateImageUrl(ctx.input.designId, ctx.input.overrides);
    return {
      output: {
        imageUrl: result.url
      },
      message: `Generated image from design \`${ctx.input.designId}\`. [View image](${result.url})`
    };
  })
  .build();
