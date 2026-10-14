import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenInfo = SlateTool.create(spec, {
  name: 'Get API Key Permissions',
  key: 'get_token_info',
  description:
    'Inspect the permissions granted to the connected GoSquared API key. Use this to check which analytics, tracking, account, and People operations the connection can access.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ scopes: z.array(z.string()).describe('Granted API key permissions') }))
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({ token: ctx.auth.token });
    let result = await client.getTokenInfo();
    let scopes = z.array(z.string()).safeParse(result?.scopes);
    if (!scopes.success) {
      throw createApiServiceError(
        'GoSquared returned an invalid API key permissions response.'
      );
    }
    return {
      output: { scopes: scopes.data },
      message: `Retrieved **${scopes.data.length}** API key permissions.`
    };
  })
  .build();
