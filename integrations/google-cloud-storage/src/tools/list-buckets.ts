import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let listBuckets = SlateTool.create(spec, {
  name: 'List Buckets',
  key: 'list_buckets',
  description: `List Cloud Storage buckets in the configured project. Supports filtering by name prefix and pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudStorageActionScopes.listBuckets)
  .input(
    z.object({
      prefix: z
        .string()
        .optional()
        .describe('Filter buckets whose names begin with this prefix'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of buckets to return (1-1000)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      buckets: z.array(
        z.object({
          bucketName: z.string(),
          location: z.string().optional(),
          storageClass: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          versioningEnabled: z.boolean().optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listBuckets({
      prefix: ctx.input.prefix,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let buckets = (result.items || []).map((b: any) => ({
      bucketName: b.name,
      location: b.location,
      storageClass: b.storageClass,
      createdAt: b.timeCreated,
      updatedAt: b.updated,
      versioningEnabled: b.versioning?.enabled || false
    }));

    return {
      output: {
        buckets,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${buckets.length}** bucket(s)${ctx.input.prefix ? ` matching prefix "${ctx.input.prefix}"` : ''}.${result.nextPageToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
