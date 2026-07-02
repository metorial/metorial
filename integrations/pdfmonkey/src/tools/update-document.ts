import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update a PDFMonkey document's template, payload, or metadata. Set status to "pending" to queue or re-queue generation after changing the payload or metadata.`,
  instructions: [
    'Provide at least one field to update: templateId, payload, meta, or status.',
    'Use status="pending" when you want PDFMonkey to generate or regenerate the file.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update'),
      templateId: z.string().optional().describe('New template ID for the document'),
      payload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Replacement dynamic data. Must be a JSON object matching the template fields.'
        ),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Replacement document metadata. Include _filename, _password, _type, _width, _height, or _quality when needed.'
        ),
      status: z
        .enum(['pending'])
        .optional()
        .describe('Set to pending to trigger document generation or regeneration.')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the updated document'),
      templateId: z.string().describe('ID of the template used'),
      status: z.string().describe('Current document status'),
      downloadUrl: z
        .string()
        .nullable()
        .describe('URL to download the generated file, populated after success'),
      previewUrl: z.string().nullable().describe('URL to preview the document'),
      publicShareLink: z.string().nullable().describe('Public share link when available'),
      filename: z.string().nullable().describe('Filename of the generated document'),
      outputType: z.string().nullable().describe('Output format: pdf or image'),
      meta: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Document metadata returned by PDFMonkey'),
      failureCause: z.string().nullable().describe('Error message if generation failed'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let doc = await client.updateDocument(ctx.input.documentId, {
      templateId: ctx.input.templateId,
      payload: ctx.input.payload,
      meta: ctx.input.meta,
      status: ctx.input.status
    });

    let output = {
      documentId: String(doc.id),
      templateId: String(doc.document_template_id),
      status: String(doc.status),
      downloadUrl: doc.download_url ? String(doc.download_url) : null,
      previewUrl: doc.preview_url ? String(doc.preview_url) : null,
      publicShareLink: doc.public_share_link ? String(doc.public_share_link) : null,
      filename: doc.filename ? String(doc.filename) : null,
      outputType: doc.output_type ? String(doc.output_type) : null,
      meta:
        doc.meta && typeof doc.meta === 'object'
          ? (doc.meta as Record<string, unknown>)
          : null,
      failureCause: doc.failure_cause ? String(doc.failure_cause) : null,
      updatedAt: String(doc.updated_at)
    };

    return {
      output,
      message: `Document **${output.documentId}** updated with status **${output.status}**.`
    };
  })
  .build();
