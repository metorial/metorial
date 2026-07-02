import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

let modificationSchema = z
  .object({
    name: z.string().describe('Name of the layer in the template to modify'),
    text: z.string().optional().describe('Text content for a text layer'),
    color: z.string().optional().describe('Color value (hex) for the layer'),
    background: z.string().optional().describe('Background color (hex) for the layer'),
    image_url: z.string().optional().describe('URL of an image to use for an image layer'),
    star_rating: z.number().optional().describe('Star rating value (for star rating layers)'),
    chart_data: z.string().optional().describe('Comma-separated chart data values'),
    barcode_data: z.string().optional().describe('Data to encode in a barcode layer'),
    qr_data: z.string().optional().describe('Data to encode in a QR code layer'),
    font_family: z.string().optional().describe('Font family name to use for a text layer'),
    font_size: z.number().optional().describe('Font size for a text layer'),
    font_weight: z.string().optional().describe('Font weight (e.g. "bold") for a text layer'),
    effect: z.string().optional().describe('Effect to apply (e.g. "Grayscale", "Sepia")'),
    hide: z.boolean().optional().describe('Whether to hide this layer')
  })
  .describe('Modification to apply to a template layer');

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate an image from a Bannerbear design template by applying modifications to its layers. Supports text, images, colors, fonts, QR codes, bar codes, star ratings, and chart data. Returns the generated image URLs (JPG, PNG, and optionally PDF).`,
  instructions: [
    'You must provide a valid template UID and at least one modification targeting a named layer.',
    'Layer names must match exactly as defined in the Bannerbear template editor.'
  ],
  constraints: [
    'Image generation is asynchronous. The response may have status "pending" until rendering completes.',
    'Rate limited to 30 requests per 10 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateUid: z.string().describe('UID of the template to generate an image from'),
      modifications: z
        .array(modificationSchema)
        .describe('List of modifications to apply to template layers'),
      transparent: z.boolean().optional().describe('Render with a transparent background'),
      renderPdf: z.boolean().optional().describe('Also generate a PDF version of the image'),
      metadata: z
        .string()
        .optional()
        .describe('Custom metadata to attach to the image (e.g. an external record ID)'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when rendering completes'),
      templateVersion: z.number().optional().describe('Specific template version to use')
    })
  )
  .output(
    z.object({
      imageUid: z.string().describe('UID of the generated image'),
      status: z.string().describe('Rendering status (pending, completed, failed)'),
      imageUrl: z.string().nullable().describe('URL of the generated JPG image'),
      imageUrlPng: z.string().nullable().describe('URL of the generated PNG image'),
      pdfUrl: z.string().nullable().describe('URL of the generated PDF (if requested)'),
      templateUid: z.string().describe('UID of the template used'),
      createdAt: z.string().describe('Timestamp when the image was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createImage({
      template: ctx.input.templateUid,
      modifications: ctx.input.modifications,
      transparent: ctx.input.transparent,
      render_pdf: ctx.input.renderPdf,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl,
      template_version: ctx.input.templateVersion
    });

    return {
      output: {
        imageUid: result.uid,
        status: result.status,
        imageUrl: result.image_url || null,
        imageUrlPng: result.image_url_png || null,
        pdfUrl: result.pdf_url || null,
        templateUid: result.template,
        createdAt: result.created_at
      },
      message: `Image generation ${result.status === 'completed' ? 'completed' : 'initiated'} (UID: ${result.uid}). ${result.image_url ? `[View image](${result.image_url})` : 'Image is still rendering.'}`
    };
  })
  .build();
