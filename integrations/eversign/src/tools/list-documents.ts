import { SlateTool } from 'slates';
import { z } from 'zod';
import { asOptionalString, createClient, isEnabled } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List documents filtered by status type. Supports pagination and filtering by categories like all documents, action required, waiting for others, completed, drafts, or cancelled. Call list_businesses to discover the businessId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: businessIdSchema,
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
      page: z
        .number()
        .refine(Number.isSafeInteger, { message: 'Must be a whole number' })
        .min(1)
        .optional()
        .describe('Page number for pagination, starting at 1'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, { message: 'Must be a whole number' })
        .min(1)
        .max(500)
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
    let client = createClient(ctx.config, ctx.auth, ctx.input.businessId);
    let docs = await client.listDocuments(ctx.input.type, ctx.input.page, ctx.input.limit);

    let documents = (Array.isArray(docs) ? docs : []).map((doc: any) => ({
      documentHash: doc.document_hash,
      title: doc.title || undefined,
      isDraft: isEnabled(doc.is_draft),
      isCompleted: isEnabled(doc.is_completed),
      isCancelled: isEnabled(doc.is_cancelled),
      isExpired: isEnabled(doc.is_expired),
      createdAt: asOptionalString(doc.created),
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
