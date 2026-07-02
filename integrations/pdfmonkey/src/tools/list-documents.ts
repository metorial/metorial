import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List generated documents with optional filters by template, status, or update time. Returns paginated results (24 per page) with lightweight document cards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      templateId: z.string().optional().describe('Filter by template ID'),
      status: z
        .enum(['success', 'failure', 'draft', 'pending', 'generating'])
        .optional()
        .describe('Filter by document status'),
      updatedSince: z
        .string()
        .optional()
        .describe('Filter documents updated after this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('ID of the document'),
            templateId: z.string().describe('ID of the template used'),
            status: z.string().describe('Document status'),
            downloadUrl: z.string().nullable().describe('Download URL (valid for 1 hour)'),
            previewUrl: z.string().nullable().describe('Preview URL'),
            publicShareLink: z.string().nullable().describe('Public share link'),
            filename: z.string().nullable().describe('Document filename'),
            outputType: z.string().nullable().describe('Output format: pdf or image'),
            failureCause: z.string().nullable().describe('Error message if failed'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of documents'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      nextPage: z.number().nullable().describe('Next page number or null'),
      prevPage: z.number().nullable().describe('Previous page number or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocuments({
      page: ctx.input.page,
      templateId: ctx.input.templateId,
      status: ctx.input.status,
      updatedSince: ctx.input.updatedSince
    });

    let documents = result.documents.map(doc => ({
      documentId: String(doc.id),
      templateId: String(doc.document_template_id),
      status: String(doc.status),
      downloadUrl: doc.download_url ? String(doc.download_url) : null,
      previewUrl: doc.preview_url ? String(doc.preview_url) : null,
      publicShareLink: doc.public_share_link ? String(doc.public_share_link) : null,
      filename: doc.filename ? String(doc.filename) : null,
      outputType: doc.output_type ? String(doc.output_type) : null,
      failureCause: doc.failure_cause ? String(doc.failure_cause) : null,
      createdAt: String(doc.created_at),
      updatedAt: String(doc.updated_at)
    }));

    let meta = result.meta;

    return {
      output: {
        documents,
        currentPage: Number(meta.current_page),
        totalPages: Number(meta.total_pages),
        nextPage: meta.next_page ? Number(meta.next_page) : null,
        prevPage: meta.prev_page ? Number(meta.prev_page) : null
      },
      message: `Found **${documents.length}** document(s) on page ${meta.current_page} of ${meta.total_pages}.`
    };
  })
  .build();
