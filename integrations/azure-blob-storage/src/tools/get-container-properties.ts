import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContainerProperties = SlateTool.create(spec, {
  name: 'Get Container Properties',
  key: 'get_container_properties',
  description: `Retrieve properties and metadata for a specific container. Returns system properties like lease status, public access level, and user-defined metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Name of the container'),
      lastModified: z.string().describe('Last modification time'),
      eTag: z.string().describe('ETag of the container'),
      leaseStatus: z.string().describe('Lease status'),
      leaseState: z.string().describe('Lease state'),
      publicAccess: z.string().describe('Public access level'),
      hasImmutabilityPolicy: z
        .string()
        .describe('Whether the container has an immutability policy'),
      hasLegalHold: z.string().describe('Whether the container has a legal hold'),
      metadata: z.record(z.string(), z.string()).describe('User-defined metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let result = await client.getContainerProperties(ctx.input.containerName);

    return {
      output: {
        containerName: ctx.input.containerName,
        lastModified: result.properties.lastModified ?? '',
        eTag: result.properties.eTag ?? '',
        leaseStatus: result.properties.leaseStatus ?? '',
        leaseState: result.properties.leaseState ?? '',
        publicAccess: result.properties.publicAccess ?? 'private',
        hasImmutabilityPolicy: result.properties.hasImmutabilityPolicy ?? 'false',
        hasLegalHold: result.properties.hasLegalHold ?? 'false',
        metadata: result.metadata
      },
      message: `Retrieved properties for container **${ctx.input.containerName}**.`
    };
  })
  .build();
