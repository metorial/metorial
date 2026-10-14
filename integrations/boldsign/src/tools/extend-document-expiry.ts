import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extendDocumentExpiry = SlateTool.create(spec, {
  name: 'Extend Document Expiry',
  key: 'extend_document_expiry',
  description:
    'Extend the signing deadline for an existing document and optionally update its expiry warning.',
  instructions: [
    'Call get_document to check the document and its creation date. The new expiry must remain within 180 days of document creation.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID from list_documents or get_document'),
      newExpiryValue: z
        .string()
        .min(1)
        .describe(
          'For Days expiry, use yyyy-MM-dd; for Hours, use an integer string; for Specific Date and Time, use an ISO timestamp'
        ),
      onBehalfOf: z
        .string()
        .optional()
        .describe('Sender identity email for a document sent on behalf of another sender'),
      warnPrior: z
        .boolean()
        .optional()
        .describe(
          'Send an expiry notification one day before the deadline; omit to preserve the existing setting'
        )
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Updated document ID'),
      newExpiryValue: z.string().describe('Requested signing deadline'),
      success: z.boolean().describe('Whether BoldSign accepted the expiry update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, region: ctx.config.region });
    await client.extendDocumentExpiry(ctx.input);
    return {
      output: {
        documentId: ctx.input.documentId,
        newExpiryValue: ctx.input.newExpiryValue,
        success: true
      },
      message: `Extended the expiry for document **${ctx.input.documentId}**.`
    };
  })
  .build();
