import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadBlob = SlateTool.create(spec, {
  name: 'Download Blob',
  key: 'download_blob',
  description: `Download the content of a blob. Supports partial content retrieval using byte range requests. Returns the blob as an attachment along with metadata.`,
  instructions: [
    'Binary content will be returned as-is and may not be human-readable.',
    'Use range parameters for large blobs to download specific byte ranges.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the blob to download'),
      rangeOffset: z.number().optional().describe('Start byte offset for partial download'),
      rangeLength: z.number().optional().describe('Number of bytes to download from offset')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob belongs to'),
      blobName: z.string().describe('Name of the downloaded blob'),
      contentType: z.string().describe('MIME content type'),
      contentLength: z.number().describe('Size of the returned content in bytes'),
      metadata: z.record(z.string(), z.string()).describe('User-defined metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let range =
      ctx.input.rangeOffset !== undefined
        ? { offset: ctx.input.rangeOffset, length: ctx.input.rangeLength }
        : undefined;

    let result = await client.downloadBlob(ctx.input.containerName, ctx.input.blobName, range);

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        contentType: result.contentType,
        contentLength: result.contentLength,
        metadata: result.metadata
      },
      attachments: [createTextAttachment(result.content, result.contentType || undefined)],
      message: `Downloaded blob **${ctx.input.blobName}** from container **${ctx.input.containerName}** (${result.contentLength} bytes, ${result.contentType}).`
    };
  })
  .build();
