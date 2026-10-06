import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { connectionId, integrationId, invalid, jsonObject, z } from '../lib/schemas';
import { spec } from '../spec';
export const manageConnectionMetadata = SlateTool.create(spec, {
  name: 'Manage Connection Metadata',
  key: 'manage_connection_metadata',
  description:
    'Set or update metadata for exact connection/integration pairs from list_connections. Set replaces the entire metadata object; update overwrites only supplied properties. Read back every target to verify state. Bulk requests may have retained effects if the response is uncertain.'
})
  .input(
    z.object({
      action: z.enum(['set', 'update']),
      connectionId: z.union([connectionId, z.array(connectionId).min(1).max(100)]),
      providerConfigKey: integrationId,
      metadata: jsonObject
    })
  )
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    const ids =
      typeof ctx.input.connectionId === 'string'
        ? [ctx.input.connectionId]
        : ctx.input.connectionId;
    if (new Set(ids).size !== ids.length)
      throw invalid('Supply distinct exact connection IDs.');
    await clientFor(ctx).changeMetadata(ctx.input.action, {
      connection_id: ctx.input.connectionId,
      provider_config_key: ctx.input.providerConfigKey,
      metadata: ctx.input.metadata
    });
    return {
      output: { success: true },
      message:
        'Nango returned the exact metadata receipt. Read each target to verify stored state.'
    };
  })
  .build();
