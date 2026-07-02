import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadFiles = SlateTool.create(spec, {
  name: 'Download Files',
  key: 'download_files',
  description: `Download the documents associated with a signature request or template. Returns the PDF or ZIP file as a Slate attachment and keeps structured output limited to metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['signature_request', 'template'])
        .describe('Whether to download files from a signature request or a template'),
      resourceId: z.string().describe('ID of the signature request or template'),
      fileType: z
        .enum(['pdf', 'zip'])
        .optional()
        .describe('File format to download (default: pdf)')
    })
  )
  .output(
    z.object({
      resourceType: z.string().describe('Type of the resource'),
      resourceId: z.string().describe('ID of the resource'),
      fileType: z.string().describe('Downloaded file format'),
      mimeType: z.string().describe('MIME type of the returned attachment'),
      byteLength: z.number().describe('Decoded byte length of the returned attachment'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result: { contentBase64: string; mimeType: string; byteLength: number };

    if (ctx.input.resourceType === 'signature_request') {
      result = await client.getSignatureRequestFiles(ctx.input.resourceId, ctx.input.fileType);
    } else {
      result = await client.getTemplateFiles(ctx.input.resourceId, ctx.input.fileType);
    }

    return {
      output: {
        resourceType: ctx.input.resourceType,
        resourceId: ctx.input.resourceId,
        fileType: ctx.input.fileType || 'pdf',
        mimeType: result.mimeType,
        byteLength: result.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(result.contentBase64, result.mimeType)],
      message: `Downloaded ${ctx.input.resourceType} **${ctx.input.resourceId}** as a ${ctx.input.fileType || 'pdf'} attachment.`
    };
  })
  .build();
