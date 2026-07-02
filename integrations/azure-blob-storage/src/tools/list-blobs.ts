import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBlobs = SlateTool.create(spec, {
  name: 'List Blobs',
  key: 'list_blobs',
  description: `List blobs in a container. Supports filtering by prefix, hierarchical listing with delimiters, and pagination. Use the delimiter "/" to browse blobs like a folder structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container to list blobs from'),
      prefix: z
        .string()
        .optional()
        .describe('Filter blobs whose names begin with this prefix (e.g. "images/")'),
      delimiter: z
        .string()
        .optional()
        .describe('Character to group blob names hierarchically (usually "/")'),
      maxResults: z.number().optional().describe('Maximum number of blobs to return'),
      marker: z
        .string()
        .optional()
        .describe('Continuation token for pagination from a previous request'),
      includeMetadata: z.boolean().optional().describe('Include blob metadata in results'),
      includeSnapshots: z.boolean().optional().describe('Include blob snapshots in results')
    })
  )
  .output(
    z.object({
      blobs: z
        .array(
          z.object({
            blobName: z.string().describe('Full name/path of the blob'),
            containerName: z.string().describe('Container the blob belongs to'),
            creationTime: z.string().describe('Blob creation time'),
            lastModified: z.string().describe('Last modification time'),
            eTag: z.string().describe('ETag of the blob'),
            contentLength: z.number().describe('Size of the blob in bytes'),
            contentType: z.string().describe('MIME content type'),
            blobType: z.string().describe('Type of blob (BlockBlob, AppendBlob, PageBlob)'),
            accessTier: z.string().describe('Access tier (Hot, Cool, Cold, Archive)'),
            metadata: z.record(z.string(), z.string()).describe('User-defined metadata')
          })
        )
        .describe('List of blobs'),
      blobPrefixes: z
        .array(z.string())
        .describe('Virtual directory prefixes when using delimiter'),
      nextMarker: z.string().optional().describe('Continuation token for next page'),
      totalCount: z.number().describe('Number of blobs returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let include: string[] = [];
    if (ctx.input.includeMetadata) include.push('metadata');
    if (ctx.input.includeSnapshots) include.push('snapshots');

    let result = await client.listBlobs(ctx.input.containerName, {
      prefix: ctx.input.prefix,
      delimiter: ctx.input.delimiter,
      maxResults: ctx.input.maxResults,
      marker: ctx.input.marker,
      include: include.length > 0 ? include : undefined
    });

    return {
      output: {
        blobs: result.blobs,
        blobPrefixes: result.blobPrefixes,
        nextMarker: result.nextMarker,
        totalCount: result.blobs.length
      },
      message: `Found **${result.blobs.length}** blob(s) in container **${ctx.input.containerName}**${ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : ''}${result.blobPrefixes.length > 0 ? ` and ${result.blobPrefixes.length} virtual directories` : ''}.`
    };
  })
  .build();
