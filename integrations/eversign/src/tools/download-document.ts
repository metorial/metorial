import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Get a download URL for a document PDF. Choose between the original (raw) document or the final signed version. Optionally include the audit trail with the final document.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
      downloadUrl: z.string().describe('URL to download the document PDF'),
      documentHash: z.string().describe('Document hash identifier'),
      type: z.string().describe('Type of download (raw or final)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let url = await client.getDownloadUrl(
      ctx.input.documentHash,
      ctx.input.type,
      ctx.input.includeAuditTrail
    );

    return {
      output: {
        downloadUrl: typeof url === 'string' ? url : String(url),
        documentHash: ctx.input.documentHash,
        type: ctx.input.type
      },
      message: `Download URL generated for ${ctx.input.type} version of document "${ctx.input.documentHash}".${ctx.input.includeAuditTrail ? ' Includes audit trail.' : ''}`
    };
  })
  .build();
