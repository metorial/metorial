import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generate a PDF or image document from a template with dynamic data. Supports both **synchronous** (waits for completion) and **asynchronous** (returns immediately, generation happens in the background) modes. Use synchronous mode when you need the download URL immediately; use asynchronous mode for large documents or batch processing.

Optionally set a custom filename via the \`filename\` field, or password-protect the PDF via the \`password\` field. For image generation, use \`imageType\`, \`imageWidth\`, \`imageHeight\`, and \`imageQuality\` fields.`,
  instructions: [
    'You must provide a valid template ID. List templates first if you do not know the template ID.',
    'The payload must match the dynamic data fields expected by the template.',
    'Synchronous generation blocks until the document is ready or fails. Use it for quick documents.',
    'For image generation, the template must be configured for image output (Engine v5). Set imageType, imageWidth, imageHeight as needed.'
  ],
  constraints: [
    'Download URLs expire after 1 hour. Fetch the document again if the URL has expired.',
    'Synchronous endpoint returns a lightweight document card without the payload field.',
    'Document generation consumes quota. Check account quota if generation fails.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to use for generation'),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Dynamic data to populate the template with. Must be a JSON object matching the template fields.'
        ),
      synchronous: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, waits for generation to complete before responding. Defaults to false (async).'
        ),
      filename: z
        .string()
        .optional()
        .describe('Custom filename for the generated PDF (without extension)'),
      password: z
        .string()
        .optional()
        .describe('Password to encrypt the generated PDF with AES-256'),
      imageType: z
        .enum(['webp', 'png', 'jpg'])
        .optional()
        .describe('Image output format (for image templates only)'),
      imageWidth: z
        .number()
        .optional()
        .describe('Image width in pixels (for image templates only)'),
      imageHeight: z
        .number()
        .optional()
        .describe('Image height in pixels (for image templates only)'),
      imageQuality: z
        .number()
        .optional()
        .describe('Image quality percentage for WebP (for image templates only, default 100)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the generated document'),
      status: z
        .string()
        .describe('Current status: draft, pending, generating, success, or failure'),
      downloadUrl: z
        .string()
        .nullable()
        .describe('URL to download the generated file (valid for 1 hour)'),
      previewUrl: z.string().nullable().describe('URL to preview the document'),
      publicShareLink: z
        .string()
        .nullable()
        .describe('Public share link (Premium plans only)'),
      filename: z.string().nullable().describe('Filename of the generated document'),
      failureCause: z.string().nullable().describe('Error message if generation failed'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let meta: Record<string, unknown> = {};
    if (ctx.input.filename) meta._filename = ctx.input.filename;
    if (ctx.input.password) meta._password = ctx.input.password;
    if (ctx.input.imageType) meta._type = ctx.input.imageType;
    if (ctx.input.imageWidth) meta._width = ctx.input.imageWidth;
    if (ctx.input.imageHeight) meta._height = ctx.input.imageHeight;
    if (ctx.input.imageQuality) meta._quality = ctx.input.imageQuality;

    let params = {
      templateId: ctx.input.templateId,
      status: 'pending' as const,
      payload: ctx.input.payload,
      meta: Object.keys(meta).length > 0 ? meta : undefined
    };

    let doc: Record<string, unknown>;

    if (ctx.input.synchronous) {
      doc = await client.createDocumentSync(params);
    } else {
      doc = await client.createDocument(params);
    }

    let output = {
      documentId: String(doc.id),
      status: String(doc.status),
      downloadUrl: doc.download_url ? String(doc.download_url) : null,
      previewUrl: doc.preview_url ? String(doc.preview_url) : null,
      publicShareLink: doc.public_share_link ? String(doc.public_share_link) : null,
      filename: doc.filename ? String(doc.filename) : null,
      failureCause: doc.failure_cause ? String(doc.failure_cause) : null,
      createdAt: String(doc.created_at),
      updatedAt: String(doc.updated_at)
    };

    let statusMsg =
      output.status === 'success'
        ? `Document **${output.documentId}** generated successfully.`
        : output.status === 'failure'
          ? `Document **${output.documentId}** generation failed: ${output.failureCause}`
          : `Document **${output.documentId}** created with status **${output.status}**.`;

    let downloadMsg = output.downloadUrl ? ` [Download](${output.downloadUrl})` : '';

    return {
      output,
      message: `${statusMsg}${downloadMsg}`
    };
  })
  .build();
