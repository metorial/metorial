import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let documentGenerated = SlateTrigger.create(spec, {
  name: 'Document Generated',
  key: 'document_generated',
  description:
    'Triggers when a document is successfully generated. Receives the full document details via webhook. Configure the webhook URL in the PDFMonkey dashboard under Webhooks settings, selecting the "documents.generation.success" event type.'
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the generated document'),
      templateId: z.string().describe('ID of the template used'),
      workspaceId: z.string().describe('ID of the workspace'),
      status: z.string().describe('Document status (success)'),
      downloadUrl: z.string().nullable().describe('URL to download the generated PDF'),
      previewUrl: z.string().nullable().describe('URL to preview the document'),
      publicShareLink: z.string().nullable().describe('Public share link'),
      filename: z.string().nullable().describe('Document filename'),
      checksum: z.string().nullable().describe('Document checksum'),
      meta: z.string().nullable().describe('Document metadata JSON string'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the generated document'),
      templateId: z.string().describe('ID of the template used'),
      workspaceId: z.string().describe('ID of the workspace'),
      status: z.string().describe('Document status'),
      downloadUrl: z
        .string()
        .nullable()
        .describe('URL to download the generated PDF (valid for 1 hour)'),
      previewUrl: z.string().nullable().describe('URL to preview the document'),
      publicShareLink: z
        .string()
        .nullable()
        .describe('Public share link (Premium plans only)'),
      filename: z.string().nullable().describe('Document filename'),
      checksum: z.string().nullable().describe('Document checksum'),
      meta: z.string().nullable().describe('Document metadata JSON string'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let doc = data.document as Record<string, unknown>;

      return {
        inputs: [
          {
            documentId: String(doc.id),
            templateId: String(doc.document_template_id),
            workspaceId: String(doc.app_id),
            status: String(doc.status),
            downloadUrl: doc.download_url ? String(doc.download_url) : null,
            previewUrl: doc.preview_url ? String(doc.preview_url) : null,
            publicShareLink: doc.public_share_link ? String(doc.public_share_link) : null,
            filename: doc.filename ? String(doc.filename) : null,
            checksum: doc.checksum ? String(doc.checksum) : null,
            meta: doc.meta ? String(doc.meta) : null,
            createdAt: String(doc.created_at),
            updatedAt: String(doc.updated_at)
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.generation_success',
        id: ctx.input.documentId,
        output: {
          documentId: ctx.input.documentId,
          templateId: ctx.input.templateId,
          workspaceId: ctx.input.workspaceId,
          status: ctx.input.status,
          downloadUrl: ctx.input.downloadUrl,
          previewUrl: ctx.input.previewUrl,
          publicShareLink: ctx.input.publicShareLink,
          filename: ctx.input.filename,
          checksum: ctx.input.checksum,
          meta: ctx.input.meta,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
