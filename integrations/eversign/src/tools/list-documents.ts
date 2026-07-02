import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List documents filtered by status type. Supports pagination and filtering by categories like all documents, action required, waiting for others, completed, drafts, or cancelled.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum([
          'all',
          'my_action_required',
          'waiting_for_others',
          'completed',
          'drafts',
          'cancelled'
        ])
        .default('all')
        .describe('Filter documents by status type'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of documents to return (default 500)')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentHash: z.string().describe('Document hash identifier'),
            title: z.string().optional().describe('Document title'),
            isDraft: z.boolean().describe('Whether the document is a draft'),
            isCompleted: z.boolean().describe('Whether the document is completed'),
            isCancelled: z.boolean().describe('Whether the document was cancelled'),
            isExpired: z.boolean().describe('Whether the document has expired'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            signerCount: z.number().describe('Number of signers')
          })
        )
        .describe('List of documents'),
      totalCount: z.number().describe('Number of documents returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let docs = await client.listDocuments(ctx.input.type, ctx.input.page, ctx.input.limit);

    let documents = (Array.isArray(docs) ? docs : []).map((doc: any) => ({
      documentHash: doc.document_hash,
      title: doc.title || undefined,
      isDraft: doc.is_draft === 1 || doc.is_draft === true,
      isCompleted: doc.is_completed === 1 || doc.is_completed === true,
      isCancelled: doc.is_cancelled === 1 || doc.is_cancelled === true,
      isExpired: doc.is_expired === 1 || doc.is_expired === true,
      createdAt: doc.created ?? undefined,
      signerCount: (doc.signers || []).length
    }));

    return {
      output: {
        documents,
        totalCount: documents.length
      },
      message: `Found ${documents.length} document(s) with filter "${ctx.input.type}".`
    };
  })
  .build();
