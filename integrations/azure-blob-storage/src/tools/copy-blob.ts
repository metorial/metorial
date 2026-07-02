import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyBlob = SlateTool.create(spec, {
  name: 'Copy Blob',
  key: 'copy_blob',
  description: `Copy a blob from a source URL to a destination in the storage account. Supports copying within the same account, across accounts, or from any accessible URL. The copy operation runs asynchronously for large blobs.`,
  instructions: [
    'The source URL must be publicly accessible or include a SAS token for authorization.',
    'To copy within the same account, use the full blob URL as the source.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Destination container name'),
      blobName: z.string().describe('Destination blob name/path'),
      sourceUrl: z
        .string()
        .describe('Full URL of the source blob (including SAS token if required)'),
      accessTier: z
        .enum(['Hot', 'Cool', 'Cold', 'Archive'])
        .optional()
        .describe('Access tier for the destination blob'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata to set on the destination blob')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Destination container'),
      blobName: z.string().describe('Destination blob name'),
      copyId: z.string().describe('Unique ID of the copy operation'),
      copyStatus: z.string().describe('Status of the copy (pending or success)'),
      destinationUrl: z.string().describe('Full URL of the destination blob')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let result = await client.copyBlob(
      ctx.input.containerName,
      ctx.input.blobName,
      ctx.input.sourceUrl,
      {
        accessTier: ctx.input.accessTier,
        metadata: ctx.input.metadata
      }
    );

    let destinationUrl = client.getBlobUrl(ctx.input.containerName, ctx.input.blobName);

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        copyId: result.copyId,
        copyStatus: result.copyStatus,
        destinationUrl
      },
      message: `Copy initiated for blob **${ctx.input.blobName}** in container **${ctx.input.containerName}** (status: ${result.copyStatus}).`
    };
  })
  .build();
