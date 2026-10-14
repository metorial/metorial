import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Download a signed document PDF or its tamper-proof audit trail. Use "document" for the signed PDF or "auditLog" for the audit trail.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The ID of the document to download'),
      downloadType: z
        .enum(['document', 'auditLog'])
        .default('document')
        .describe('What to download: the signed document PDF or the audit trail'),
      onBehalfOf: z.string().optional().describe('Download on behalf of this email address')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('The ID of the downloaded document'),
      downloadType: z
        .enum(['document', 'auditLog'])
        .describe('What was downloaded: the signed PDF or the audit trail')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      region: ctx.config.region
    });

    let file = client.getDownloadDetails(
      ctx.input.documentId,
      ctx.input.downloadType,
      ctx.input.onBehalfOf
    );
    await ctx.addAttachment({ type: 'url', ...file });

    return {
      output: {
        documentId: ctx.input.documentId,
        downloadType: ctx.input.downloadType
      },
      message: `Downloaded ${ctx.input.downloadType === 'auditLog' ? 'audit trail' : 'document'} for **${ctx.input.documentId}**.`
    };
  })
  .build();
