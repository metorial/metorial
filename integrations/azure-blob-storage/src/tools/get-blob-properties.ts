import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBlobProperties = SlateTool.create(spec, {
  name: 'Get Blob Properties',
  key: 'get_blob_properties',
  description: `Retrieve system properties and user-defined metadata for a blob without downloading its content. Returns content type, size, access tier, lease status, copy status, and custom metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the blob')
    })
  )
  .output(
    z.object({
      blobName: z.string().describe('Name of the blob'),
      containerName: z.string().describe('Container the blob belongs to'),
      lastModified: z.string().describe('Last modification time'),
      eTag: z.string().describe('ETag of the blob'),
      contentLength: z.number().describe('Size of the blob in bytes'),
      contentType: z.string().describe('MIME content type'),
      contentEncoding: z.string().describe('Content encoding'),
      contentLanguage: z.string().describe('Content language'),
      contentDisposition: z.string().describe('Content disposition'),
      cacheControl: z.string().describe('Cache control directive'),
      blobType: z.string().describe('Type of blob (BlockBlob, AppendBlob, PageBlob)'),
      accessTier: z.string().describe('Access tier (Hot, Cool, Cold, Archive)'),
      leaseStatus: z.string().describe('Lease status'),
      leaseState: z.string().describe('Lease state'),
      copyId: z.string().describe('Copy operation ID if blob was copied'),
      copyStatus: z.string().describe('Copy status (pending, success, aborted, failed)'),
      serverEncrypted: z.boolean().describe('Whether server-side encryption is enabled'),
      metadata: z.record(z.string(), z.string()).describe('User-defined metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let props = await client.getBlobProperties(ctx.input.containerName, ctx.input.blobName);

    return {
      output: {
        blobName: props.blobName,
        containerName: props.containerName,
        lastModified: props.lastModified,
        eTag: props.eTag,
        contentLength: props.contentLength,
        contentType: props.contentType,
        contentEncoding: props.contentEncoding,
        contentLanguage: props.contentLanguage,
        contentDisposition: props.contentDisposition,
        cacheControl: props.cacheControl,
        blobType: props.blobType,
        accessTier: props.accessTier,
        leaseStatus: props.leaseStatus,
        leaseState: props.leaseState,
        copyId: props.copyId,
        copyStatus: props.copyStatus,
        serverEncrypted: props.serverEncrypted,
        metadata: props.metadata
      },
      message: `Retrieved properties for blob **${ctx.input.blobName}** in container **${ctx.input.containerName}** (${props.contentLength} bytes, ${props.blobType}, tier: ${props.accessTier || 'default'}).`
    };
  })
  .build();
