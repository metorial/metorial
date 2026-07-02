import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let manageConnectionMetadata = SlateTool.create(spec, {
  name: 'Manage Connection Metadata',
  key: 'manage_connection_metadata',
  description: `Set or update custom metadata on one or more connections. Use **set** to completely replace all existing metadata. Use **update** to merge changes into existing metadata (only specified properties are overridden). Can target multiple connections at once.`,
  instructions: [
    'When updating multiple connections and one ID is invalid, the entire operation is aborted with no changes.',
    'Use set when you want to replace the entire metadata object.',
    'Use update when you want to modify specific metadata properties without affecting others.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['set', 'update'])
        .describe('"set" replaces all metadata; "update" merges into existing metadata'),
      connectionId: z
        .union([z.string(), z.array(z.string())])
        .describe('Connection ID or array of connection IDs'),
      providerConfigKey: z.string().describe('The integration ID (unique key)'),
      metadata: z.record(z.string(), z.any()).describe('Metadata key-value pairs')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let body = {
      connection_id: ctx.input.connectionId,
      provider_config_key: ctx.input.providerConfigKey,
      metadata: ctx.input.metadata
    };

    if (ctx.input.action === 'set') {
      await client.setConnectionMetadata(body);
    } else {
      await client.updateConnectionMetadata(body);
    }

    let connLabel = Array.isArray(ctx.input.connectionId)
      ? `${ctx.input.connectionId.length} connections`
      : `connection **${ctx.input.connectionId}**`;

    return {
      output: { success: true },
      message: `${ctx.input.action === 'set' ? 'Set' : 'Updated'} metadata on ${connLabel}.`
    };
  })
  .build();
