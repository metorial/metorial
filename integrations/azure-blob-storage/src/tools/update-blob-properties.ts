import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBlobProperties = SlateTool.create(spec, {
  name: 'Update Blob Properties',
  key: 'update_blob_properties',
  description: `Update system properties and/or user-defined metadata on a blob. Properties include content type, encoding, language, disposition, and cache control. Metadata can be updated separately or together with properties.`,
  instructions: [
    'Setting metadata replaces all existing metadata - include all keys you want to keep.',
    'Properties and metadata can be updated independently or together in one call.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the blob'),
      properties: z
        .object({
          contentType: z.string().optional().describe('MIME content type'),
          contentEncoding: z.string().optional().describe('Content encoding (e.g. "gzip")'),
          contentLanguage: z.string().optional().describe('Content language (e.g. "en-US")'),
          contentDisposition: z.string().optional().describe('Content disposition header'),
          cacheControl: z.string().optional().describe('Cache control directive')
        })
        .optional()
        .describe('System properties to update'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('User-defined metadata to set (replaces all existing metadata)')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob belongs to'),
      blobName: z.string().describe('Name of the blob'),
      propertiesUpdated: z.boolean().describe('Whether system properties were updated'),
      metadataUpdated: z.boolean().describe('Whether metadata was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let propertiesUpdated = false;
    let metadataUpdated = false;

    if (ctx.input.properties) {
      await client.setBlobProperties(
        ctx.input.containerName,
        ctx.input.blobName,
        ctx.input.properties
      );
      propertiesUpdated = true;
    }

    if (ctx.input.metadata) {
      await client.setBlobMetadata(
        ctx.input.containerName,
        ctx.input.blobName,
        ctx.input.metadata
      );
      metadataUpdated = true;
    }

    let updates: string[] = [];
    if (propertiesUpdated) updates.push('properties');
    if (metadataUpdated) updates.push('metadata');

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        propertiesUpdated,
        metadataUpdated
      },
      message: `Updated ${updates.join(' and ')} on blob **${ctx.input.blobName}** in container **${ctx.input.containerName}**.`
    };
  })
  .build();
