import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { safePayload } from '../lib/http';
import {
  connectionId,
  connectionOutput,
  connectionView,
  integrationId,
  invalid,
  jsonObject,
  z
} from '../lib/schemas';
import { spec } from '../spec';
export const manageConnection = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description:
    'Import existing credentials, retrieve metadata, or delete one exact connection/integration pair from list_connections. Credentials are never delivered. A full-access key may refresh credentials during a read; prefer read permissions without credential scopes. Import can replace existing authorization or cause connection hooks. Deletion does not guarantee upstream revocation or retained-history erasure.'
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']),
      connectionId,
      providerConfigKey: integrationId,
      forceRefresh: z
        .boolean()
        .optional()
        .describe(
          'Explicit native refresh for get only; requires read_credentials scope. Results still contain metadata only.'
        ),
      includeRefreshToken: z
        .boolean()
        .optional()
        .describe(
          'Legacy token-delivery flag; true is refused before requesting credentials.'
        ),
      credentials: jsonObject
        .optional()
        .describe('Native credential object to import, create only; never returned.'),
      metadata: jsonObject.optional(),
      connectionConfig: jsonObject.optional(),
      tags: z.record(z.string(), z.string()).optional()
    })
  )
  .output(z.object({ success: z.boolean(), connection: connectionOutput.optional() }))
  .handleInvocation(async ctx => {
    const i = ctx.input;
    if (i.includeRefreshToken)
      throw invalid(
        'Refresh-token delivery is unavailable. Omit includeRefreshToken and use a trusted Nango backend for credentials.'
      );
    if (i.action !== 'get' && i.forceRefresh !== undefined)
      throw invalid('forceRefresh applies only to get.');
    if (
      i.action !== 'create' &&
      [i.credentials, i.metadata, i.connectionConfig, i.tags].some(
        value => value !== undefined
      )
    )
      throw invalid('Import fields apply only to create.');
    if (i.action === 'create' && (!i.credentials || !Object.keys(i.credentials).length))
      throw invalid('A nonempty native credentials object is required for import.');
    safePayload(i.metadata);
    safePayload(i.connectionConfig);
    const client = clientFor(ctx);
    if (i.action === 'delete') {
      const result = await client.deleteConnection(i.connectionId, i.providerConfigKey);
      return {
        output: result,
        message: result.success
          ? 'Nango accepted connection deletion. Verify absence separately; upstream credentials or history may remain.'
          : 'Nango did not confirm deletion.'
      };
    }
    const result =
      i.action === 'get'
        ? await client.getConnection(i.connectionId, {
            provider_config_key: i.providerConfigKey,
            force_refresh: i.forceRefresh
          })
        : await client.createConnection({
            connection_id: i.connectionId,
            provider_config_key: i.providerConfigKey,
            credentials: i.credentials!,
            metadata: i.metadata,
            connection_config: i.connectionConfig,
            tags: i.tags
          });
    return {
      output: { success: true, connection: connectionView(result) },
      message: 'Retrieved the exact connection metadata. Credentials are not delivered.'
    };
  })
  .build();
