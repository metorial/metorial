import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let listObjectsTool = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description: `List objects in an S3 bucket with optional filtering by prefix. Supports pagination and delimiter-based grouping to browse folder-like hierarchies.
Use the **delimiter** parameter (typically \`/\`) to list only objects at the current "folder" level, with common prefixes representing sub-folders.`,
  constraints: [
    'Returns up to 1000 objects per request by default. Use continuationToken to paginate.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      prefix: z
        .string()
        .optional()
        .describe(
          'Filter objects by key prefix (e.g., "images/" to list objects in the images folder)'
        ),
      delimiter: z
        .string()
        .optional()
        .describe('Delimiter for grouping keys (typically "/" for folder-like listing)'),
      maxKeys: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of objects to return (default 1000)'),
      continuationToken: z
        .string()
        .optional()
        .describe('Token from a previous response to get the next page of results'),
      startAfter: z
        .string()
        .optional()
        .describe('Start listing after this key (for pagination)')
    })
  )
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            objectKey: z.string().describe('Object key (path)'),
            lastModified: z.string().describe('Last modified timestamp'),
            eTag: z.string().describe('Entity tag (hash) of the object'),
            sizeBytes: z.number().describe('Size of the object in bytes'),
            storageClass: z.string().describe('Storage class of the object')
          })
        )
        .describe('List of objects matching the criteria'),
      commonPrefixes: z
        .array(z.string())
        .describe('Common prefixes when using delimiter (sub-folders)'),
      isTruncated: z.boolean().describe('Whether there are more results to fetch'),
      nextContinuationToken: z
        .string()
        .optional()
        .describe('Token to use for fetching the next page'),
      keyCount: z.number().describe('Number of keys returned in this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.listObjects(ctx.input.bucketName, {
      prefix: ctx.input.prefix,
      delimiter: ctx.input.delimiter,
      maxKeys: ctx.input.maxKeys,
      continuationToken: ctx.input.continuationToken,
      startAfter: ctx.input.startAfter
    });

    let prefixInfo = ctx.input.prefix ? ` with prefix \`${ctx.input.prefix}\`` : '';
    let truncatedInfo = result.isTruncated ? ' (more results available)' : '';

    return {
      output: result,
      message: `Found **${result.keyCount}** object${result.keyCount !== 1 ? 's' : ''} in \`${ctx.input.bucketName}\`${prefixInfo}${truncatedInfo}.`
    };
  })
  .build();
