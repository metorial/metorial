import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let renderImage = SlateTool.create(spec, {
  name: 'Render Image',
  key: 'render_image',
  description: `Render an image or PDF from a RenderForm template with dynamic content. Provide a template ID and key-value data pairs to customize text, images, colors, and other component properties. Supports custom output dimensions, file naming, metadata attachment, and webhook notification on completion.`,
  instructions: [
    'Use the "data" field to pass component property overrides as key-value pairs, e.g. {"my-text.text": "Hello", "my-image.src": "https://..."}.',
    'For HTML templates, the data keys do not include a component ID prefix.'
  ],
  constraints: [
    'The template must already exist in your RenderForm account.',
    'waitTime is only applicable for HTML templates (max 5000ms).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The template identifier to render'),
      data: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Key-value pairs of component properties to override, e.g. {"my-text.text": "Hello World", "my-image.src": "https://example.com/img.png"}'
        ),
      fileName: z
        .string()
        .optional()
        .describe('Custom file name for the generated image or PDF'),
      width: z.number().optional().describe('Custom width in pixels to crop the output image'),
      height: z
        .number()
        .optional()
        .describe('Custom height in pixels to crop the output image'),
      version: z.string().optional().describe('Cache differentiator to force re-rendering'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Arbitrary JSON metadata to store with the rendered image'),
      batchName: z.string().optional().describe('Batch name for grouping rendered results'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when rendering is complete'),
      waitTime: z
        .number()
        .optional()
        .describe('Milliseconds to wait before rendering (HTML templates only, max 5000)')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this render request'),
      href: z.string().describe('CDN URL of the rendered image or PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.renderImage({
      template: ctx.input.templateId,
      data: ctx.input.data,
      fileName: ctx.input.fileName,
      width: ctx.input.width,
      height: ctx.input.height,
      version: ctx.input.version,
      metadata: ctx.input.metadata,
      batchName: ctx.input.batchName,
      webhookUrl: ctx.input.webhookUrl,
      waitTime: ctx.input.waitTime
    });

    return {
      output: {
        requestId: result.requestId,
        href: result.href
      },
      message: `Rendered image from template \`${ctx.input.templateId}\`. Available at: ${result.href}`
    };
  })
  .build();
