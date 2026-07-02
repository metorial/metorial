import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

let transferSchema = z
  .object({
    to: z.literal('s3').describe('Storage provider (currently only "s3" is supported)'),
    key: z.string().describe('AWS access key'),
    secret: z.string().describe('AWS secret key'),
    region: z.string().describe('AWS region name'),
    bucket: z.string().describe('S3 bucket name'),
    visibility: z.enum(['public', 'private']).optional().describe('File visibility'),
    path: z.string().optional().describe('Full file path including filename and extension'),
    endpoint: z.string().optional().describe('Custom S3-compatible endpoint URL'),
    token: z.string().optional().describe('AWS STS session token')
  })
  .optional()
  .describe('Transfer generated image to S3-compatible storage');

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate an image from a Placid template by populating its dynamic layers with data. Supports text, images, shapes, browser screenshots, barcodes/QR codes, and ratings. The generated image can optionally be transferred to S3-compatible storage. Use \`create_now\` for synchronous generation or poll the returned status for async results.`,
  instructions: [
    'Layer names must match those defined in the template. Use the List Templates or Get Template tool to discover available layers.',
    'Layer properties depend on the layer type: text layers use "text", picture layers use "image", shape layers use "background_color", etc.',
    'If a layer property is not specified, the template default is used.'
  ],
  constraints: [
    'Canvas sizes above 4000px cost additional credits.',
    'Synchronous generation (createNow: true) may time out for complex templates.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateUuid: z.string().describe('UUID of the template to generate from'),
      layers: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Layer data keyed by layer name. Each value is an object of layer properties (e.g., {"title": {"text": "Hello"}, "img": {"image": "https://..."}})'
        ),
      width: z
        .number()
        .optional()
        .describe('Output width in pixels (aspect ratio is maintained)'),
      height: z
        .number()
        .optional()
        .describe('Output height in pixels (aspect ratio is maintained)'),
      filename: z.string().optional().describe('Output filename'),
      format: z.enum(['jpg', 'png', 'webp']).optional().describe('Output image format'),
      dpi: z.number().optional().describe('Output DPI (72-300)'),
      colorMode: z.enum(['rgb', 'cmyk']).optional().describe('Output color mode'),
      createNow: z
        .boolean()
        .optional()
        .describe('Set true for synchronous generation instead of queued'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when generation completes'),
      passthrough: z
        .string()
        .optional()
        .describe('Custom reference data returned in the webhook payload (max 1024 chars)'),
      transfer: transferSchema
    })
  )
  .output(
    z.object({
      imageId: z.number().describe('Unique ID of the generated image'),
      status: z.string().describe('Generation status: queued, finished, or error'),
      imageUrl: z
        .string()
        .nullable()
        .describe('URL of the generated image (null if still queued)'),
      pollingUrl: z.string().describe('URL to poll for status updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let modifications: Record<string, unknown> = {};
    if (ctx.input.width !== undefined) modifications.width = ctx.input.width;
    if (ctx.input.height !== undefined) modifications.height = ctx.input.height;
    if (ctx.input.filename) modifications.filename = ctx.input.filename;
    if (ctx.input.format) modifications.format = ctx.input.format;
    if (ctx.input.dpi !== undefined) modifications.dpi = ctx.input.dpi;
    if (ctx.input.colorMode) modifications.color_mode = ctx.input.colorMode;

    let result = await client.createImage({
      templateUuid: ctx.input.templateUuid,
      layers: ctx.input.layers,
      modifications: Object.keys(modifications).length > 0 ? modifications : undefined,
      transfer: ctx.input.transfer,
      webhookSuccess: ctx.input.webhookUrl,
      passthrough: ctx.input.passthrough,
      createNow: ctx.input.createNow
    });

    return {
      output: {
        imageId: result.id,
        status: result.status,
        imageUrl: result.image_url,
        pollingUrl: result.polling_url
      },
      message:
        result.status === 'finished'
          ? `Image **#${result.id}** generated successfully. [View image](${result.image_url})`
          : `Image **#${result.id}** is **${result.status}**. Poll \`${result.polling_url}\` for updates.`
    };
  })
  .build();
