import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { API_VERSION, ORIGIN } from '../lib/helpers';
import { spec } from '../spec';
export let getCurrentContext = SlateTool.create(spec, {
  name: 'Get Current Shipping Context',
  key: 'get_current_context',
  description:
    'Verify read-only access and report authentication mode and known API-token test state. This connection does not expose a verified user or account identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      authenticationValid: z.boolean(),
      authenticationMode: z.enum(['api_token', 'oauth']),
      apiVersion: z.string(),
      apiServerUrl: z.string(),
      testMode: z
        .boolean()
        .optional()
        .describe(
          'Known from an authenticated API test/live token. Omitted for OAuth; individual rates may be live or test.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = new ShippoClient(ctx.auth);
    await client.listCarrierAccounts({ results: 1 });
    const testMode =
      client.scheme === 'ShippoToken'
        ? ctx.auth.token.startsWith('shippo_test_')
          ? true
          : ctx.auth.token.startsWith('shippo_live_')
            ? false
            : undefined
        : undefined;
    return {
      output: {
        authenticationValid: true,
        authenticationMode:
          client.scheme === 'Bearer' ? ('oauth' as const) : ('api_token' as const),
        apiVersion: API_VERSION,
        apiServerUrl: ORIGIN,
        testMode
      },
      message:
        'Verified shipping API access. No user or account identity claim is available through this connection.'
    };
  })
  .build();
