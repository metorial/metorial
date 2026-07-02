import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContainers = SlateTool.create(spec, {
  name: 'List Containers',
  key: 'list_containers',
  description: `List all containers in the Azure Blob Storage account. Supports filtering by name prefix and limiting the number of results returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prefix: z
        .string()
        .optional()
        .describe('Filter containers whose names begin with this prefix'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of containers to return (default: all)')
    })
  )
  .output(
    z.object({
      containers: z
        .array(
          z.object({
            containerName: z.string().describe('Name of the container'),
            lastModified: z.string().describe('Last modification time'),
            eTag: z.string().describe('ETag of the container'),
            leaseStatus: z.string().describe('Lease status (locked/unlocked)'),
            leaseState: z.string().describe('Lease state'),
            hasImmutabilityPolicy: z
              .boolean()
              .describe('Whether the container has an immutability policy'),
            hasLegalHold: z.boolean().describe('Whether the container has a legal hold'),
            publicAccess: z
              .string()
              .describe('Public access level (private, blob, container)'),
            metadata: z.record(z.string(), z.string()).describe('User-defined metadata')
          })
        )
        .describe('List of containers in the storage account'),
      totalCount: z.number().describe('Number of containers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let result = await client.listContainers(ctx.input.prefix, ctx.input.maxResults);

    return {
      output: {
        containers: result.containers,
        totalCount: result.containers.length
      },
      message: `Found **${result.containers.length}** container(s)${ctx.input.prefix ? ` matching prefix "${ctx.input.prefix}"` : ''}.`
    };
  })
  .build();
