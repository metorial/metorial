import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdfmonkeyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generate a PDF or image document from a template with dynamic data. Supports both **synchronous** (waits for completion) and **asynchronous** (returns immediately, generation happens in the background) modes. Use synchronous mode when you need the download URL immediately; use asynchronous mode for large documents or batch processing.

Optionally set a custom filename via the \`filename\` field, password-protect the PDF via the \`password\` field, attach arbitrary document metadata via \`meta\`, or return a generated file attachment when using synchronous mode. For image generation, use \`imageType\`, \`imageWidth\`, \`imageHeight\`, and \`imageQuality\` fields.`,
  instructions: [
    'You must provide a valid template ID. List templates first if you do not know the template ID.',
    'The payload must match the dynamic data fields expected by the template.',
    'Synchronous generation blocks until the document is ready or fails. Use it for quick documents.',
    'For image generation, the template must be configured for image output. Set imageType, imageWidth, imageHeight as needed.',
    'Set attachFile=true only with synchronous=true. The file bytes are returned as a Slate attachment, not inline output.'
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
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Additional document metadata. Special keys such as _filename, _password, _type, _width, _height, and _quality are managed by the dedicated fields.'
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
        .int()
        .positive()
        .optional()
        .describe('Image width in pixels (for image templates only)'),
      imageHeight: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Image height in pixels (for image templates only)'),
      imageQuality: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Image quality percentage from 1 to 100 for WebP image templates'),
      attachFile: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'When true, synchronous generation downloads the finished PDF/image and returns it as a Slate attachment.'
        )
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
      outputType: z.string().nullable().describe('Output format reported by PDFMonkey'),
      failureCause: z.string().nullable().describe('Error message if generation failed'),
      mimeType: z.string().nullable().describe('MIME type of the returned attachment'),
      byteLength: z.number().nullable().describe('Decoded byte length of the attachment'),
      attachmentCount: z.number().describe('Number of Slate attachments returned'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.attachFile && !ctx.input.synchronous) {
      throw pdfmonkeyServiceError('attachFile requires synchronous=true.');
    }

    let meta: Record<string, unknown> = { ...(ctx.input.meta ?? {}) };
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

    let attachmentResult = ctx.input.attachFile
      ? await client.downloadDocumentFile(String(doc.id))
      : undefined;

    let output = {
      documentId: String(doc.id),
      status: String(doc.status),
      downloadUrl: doc.download_url ? String(doc.download_url) : null,
      previewUrl: doc.preview_url ? String(doc.preview_url) : null,
      publicShareLink: doc.public_share_link ? String(doc.public_share_link) : null,
      filename: doc.filename ? String(doc.filename) : null,
      outputType: doc.output_type ? String(doc.output_type) : null,
      failureCause: doc.failure_cause ? String(doc.failure_cause) : null,
      mimeType: attachmentResult?.mimeType ?? null,
      byteLength: attachmentResult?.byteLength ?? null,
      attachmentCount: attachmentResult ? 1 : 0,
      createdAt: String(doc.created_at),
      updatedAt: String(doc.updated_at)
    };

    let statusMsg =
      output.status === 'success'
        ? `Document **${output.documentId}** generated successfully.`
        : output.status === 'failure'
          ? `Document **${output.documentId}** generation failed: ${output.failureCause}`
          : `Document **${output.documentId}** created with status **${output.status}**.`;

    let downloadMsg = attachmentResult
      ? ` File returned as an attachment (${attachmentResult.byteLength} bytes).`
      : output.downloadUrl
        ? ` [Download](${output.downloadUrl})`
        : '';

    return {
      output,
      attachments: attachmentResult
        ? [createBase64Attachment(attachmentResult.contentBase64, attachmentResult.mimeType)]
        : [],
      message: `${statusMsg}${downloadMsg}`
    };
  })
  .build();
