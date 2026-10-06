import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { connectionId, jsonObject, text, z } from '../lib/schemas';
import { spec } from '../spec';
export const listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description:
    'List authorized connection/integration pairs and credential-free metadata in the connected environment. Returns one native page; a full page does not prove the inventory is complete. Use least-privilege list permissions without credential scopes.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      connectionId: connectionId.optional(),
      search: text.optional().describe('Partial connection/profile search.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe(
          'Native page size; local safety bound 1,000, not a documented provider maximum.'
        ),
      page: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Native page index, sent unchanged. No server continuation receipt is documented.'
        ),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Native AND-match tag filters; Nango normalizes tag keys to lowercase.')
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          connectionId: text,
          provider: text,
          providerConfigKey: text,
          created: z.string().optional(),
          metadata: jsonObject.nullish(),
          tags: z.record(z.string(), z.string()).optional(),
          errors: z.array(z.object({ type: text, logId: text })).optional()
        })
      ),
      page: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().optional(),
      completeness: z.literal('one_native_page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listConnections(ctx.input);
    return {
      output: {
        connections: result.connections.map(item => ({
          connectionId: item.connection_id,
          provider: item.provider,
          providerConfigKey: item.provider_config_key,
          created: item.created ?? item.created_at,
          metadata: item.metadata,
          tags: item.tags,
          errors: item.errors?.map(error => ({ type: error.type, logId: error.log_id }))
        })),
        page: ctx.input.page,
        limit: ctx.input.limit,
        completeness: 'one_native_page' as const
      },
      message: 'Retrieved one connection page. Credentials are not delivered.'
    };
  })
  .build();
