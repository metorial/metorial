import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Prepare a downloadable document PDF. Choose between the original (raw) document or the final signed version. Optionally include the audit trail with the final document. Call list_businesses to discover the businessId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: businessIdSchema,
      documentHash: z.string().describe('Unique hash identifier of the document'),
      type: z
        .enum(['raw', 'final'])
        .default('final')
        .describe('Download original (raw) document or the final signed version'),
      includeAuditTrail: z
        .boolean()
        .optional()
        .describe('Include the audit trail with the final document PDF')
    })
  )
  .output(
    z.object({
      downloadUrl: z
        .string()
        .describe(
          'Provider PDF endpoint; the prepared download includes required authentication'
        ),
      documentHash: z.string().describe('Document hash identifier'),
      type: z.string().describe('Type of download (raw or final)')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.type === 'raw' && ctx.input.includeAuditTrail) {
      throw createApiServiceError(
        'Audit trails can only be included with the final PDF. Set type to final.'
      );
    }
    let client = createClient(ctx.config, ctx.auth, ctx.input.businessId);
    await client.getDocument(ctx.input.documentHash);
    let details = client.getDownloadDetails(
      ctx.input.documentHash,
      ctx.input.type,
      ctx.input.includeAuditTrail
    );
    await ctx.addAttachment({
      type: 'url',
      ...details,
      mimeType: 'application/pdf'
    });

    return {
      output: {
        downloadUrl: details.url,
        documentHash: ctx.input.documentHash,
        type: ctx.input.type
      },
      message: `Prepared the ${ctx.input.type} PDF of document "${ctx.input.documentHash}" for download.${ctx.input.type === 'final' && ctx.input.includeAuditTrail ? ' Includes audit trail.' : ''}`
    };
  })
  .build();
