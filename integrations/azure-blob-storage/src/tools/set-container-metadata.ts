import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setContainerMetadata = SlateTool.create(spec, {
  name: 'Set Container Metadata',
  key: 'set_container_metadata',
  description: `Set user-defined metadata on a container. This replaces all existing metadata with the provided key-value pairs. To clear metadata, pass an empty object.`,
  instructions: [
    'Metadata keys must be valid C# identifiers and are case-insensitive.',
    'Setting metadata replaces all existing metadata - include all keys you want to keep.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      metadata: z.record(z.string(), z.string()).describe('Key-value pairs to set as metadata')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Name of the container'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    await client.setContainerMetadata(ctx.input.containerName, ctx.input.metadata);

    return {
      output: {
        containerName: ctx.input.containerName,
        success: true
      },
      message: `Metadata updated on container **${ctx.input.containerName}** with ${Object.keys(ctx.input.metadata).length} key(s).`
    };
  })
  .build();
