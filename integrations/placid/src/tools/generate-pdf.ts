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
  .describe('Transfer generated PDF to S3-compatible storage');

let pageSchema = z.object({
  templateUuid: z.string().describe('UUID of the template used for this page'),
  layers: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .describe('Layer data keyed by layer name')
});

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF document from one or more Placid templates used as pages. Each page is a template populated with dynamic layer data. Pages are merged in the order provided. Supports output customization for DPI, color mode, and image quality. The generated PDF can be transferred to S3-compatible storage.`,
  instructions: [
    'Provide one or more pages, each referencing a template UUID and optional layer data.',
    'Pages are rendered in the order specified in the array.'
  ],
  constraints: ['Each PDF page costs 2 credits for canvas sizes up to 4000px.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pages: z
        .array(pageSchema)
        .min(1)
        .describe(
          'Array of pages to include in the PDF, each with a template UUID and optional layer data'
        ),
      filename: z.string().optional().describe('Output filename'),
      imageQuality: z
        .enum(['high', 'medium', 'low'])
        .optional()
        .describe('Image quality for embedded images'),
      dpi: z.number().optional().describe('Output DPI (96, 150, or 300)'),
      colorMode: z.enum(['rgb', 'cmyk']).optional().describe('Output color mode'),
      colorProfile: z
        .string()
        .optional()
        .describe('Color profile (e.g., sRGB, CMYK profiles)'),
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
      pdfId: z.number().describe('Unique ID of the generated PDF'),
      status: z.string().describe('Generation status: queued, finished, or error'),
      pdfUrl: z
        .string()
        .nullable()
        .describe('URL of the generated PDF (null if still queued)'),
      pollingUrl: z.string().describe('URL to poll for status updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let modifications: Record<string, unknown> = {};
    if (ctx.input.filename) modifications.filename = ctx.input.filename;
    if (ctx.input.imageQuality) modifications.image_quality = ctx.input.imageQuality;
    if (ctx.input.dpi !== undefined) modifications.dpi = ctx.input.dpi;
    if (ctx.input.colorMode) modifications.color_mode = ctx.input.colorMode;
    if (ctx.input.colorProfile) modifications.color_profile = ctx.input.colorProfile;

    let result = await client.createPdf({
      pages: ctx.input.pages.map(page => ({
        templateUuid: page.templateUuid,
        layers: page.layers
      })),
      modifications: Object.keys(modifications).length > 0 ? modifications : undefined,
      transfer: ctx.input.transfer,
      webhookSuccess: ctx.input.webhookUrl,
      passthrough: ctx.input.passthrough
    });

    return {
      output: {
        pdfId: result.id,
        status: result.status,
        pdfUrl: result.pdf_url,
        pollingUrl: result.polling_url
      },
      message:
        result.status === 'finished'
          ? `PDF **#${result.id}** generated with **${ctx.input.pages.length}** page(s). [View PDF](${result.pdf_url})`
          : `PDF **#${result.id}** with **${ctx.input.pages.length}** page(s) is **${result.status}**. Poll \`${result.polling_url}\` for updates.`
    };
  })
  .build();
