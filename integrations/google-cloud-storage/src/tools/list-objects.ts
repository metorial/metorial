import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let listObjects = SlateTool.create(spec, {
  name: 'List Objects',
  key: 'list_objects',
  description: `List objects in a Cloud Storage bucket. Supports filtering by name prefix, delimiter-based folder simulation, and listing all object versions.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudStorageActionScopes.listObjects)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket to list objects from'),
      prefix: z
        .string()
        .optional()
        .describe('Filter objects whose names begin with this prefix (e.g., "folder/")'),
      delimiter: z
        .string()
        .optional()
        .describe('Delimiter for folder-like grouping (typically "/")'),
      maxResults: z.number().optional().describe('Maximum number of objects to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results'),
      includeVersions: z
        .boolean()
        .optional()
        .describe('Include all object versions (requires versioning enabled)')
    })
  )
  .output(
    z.object({
      objects: z.array(
        z.object({
          objectName: z.string(),
          bucketName: z.string(),
          sizeBytes: z.string().optional(),
          contentType: z.string().optional(),
          storageClass: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          generation: z.string().optional(),
          md5Hash: z.string().optional()
        })
      ),
      prefixes: z
        .array(z.string())
        .optional()
        .describe('Common prefixes when using a delimiter (simulated folders)'),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listObjects(ctx.input.bucketName, {
      prefix: ctx.input.prefix,
      delimiter: ctx.input.delimiter,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      versions: ctx.input.includeVersions
    });

    let objects = (result.items || []).map((o: any) => ({
      objectName: o.name,
      bucketName: o.bucket,
      sizeBytes: o.size,
      contentType: o.contentType,
      storageClass: o.storageClass,
      createdAt: o.timeCreated,
      updatedAt: o.updated,
      generation: o.generation,
      md5Hash: o.md5Hash
    }));

    return {
      output: {
        objects,
        prefixes: result.prefixes,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${objects.length}** object(s) in bucket **${ctx.input.bucketName}**${ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : ''}.${result.prefixes?.length ? ` Also found ${result.prefixes.length} folder prefix(es).` : ''}`
    };
  })
  .build();
