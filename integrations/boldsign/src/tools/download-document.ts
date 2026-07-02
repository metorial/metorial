import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let extractBase64FromDataUri = (value: string) => {
  let match = value.match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!match) {
    throw new Error('Expected BoldSign to return a base64 data URI.');
  }

  return {
    mimeType: match[1] || 'application/pdf',
    content: match[2]!
  };
};

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Download a signed document PDF or its audit trail. Returns the file as an attachment. Use "document" to download the signed PDF or "auditLog" to download the tamper-proof audit trail.`,
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
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result =
      ctx.input.downloadType === 'auditLog'
        ? await client.downloadAuditLog(ctx.input.documentId, ctx.input.onBehalfOf)
        : await client.downloadDocument(ctx.input.documentId, ctx.input.onBehalfOf);
    let attachment = extractBase64FromDataUri(result.downloadUrl);

    return {
      output: {
        documentId: ctx.input.documentId,
        downloadType: ctx.input.downloadType
      },
      attachments: [createBase64Attachment(attachment.content, attachment.mimeType)],
      message: `Downloaded ${ctx.input.downloadType === 'auditLog' ? 'audit trail' : 'document'} for **${ctx.input.documentId}**.`
    };
  })
  .build();
