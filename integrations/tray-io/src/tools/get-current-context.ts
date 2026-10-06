import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientConfig, TrayGraphqlClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentContext = SlateTool.create(spec, {
  key: 'get_current_context',
  name: 'Get Current Context',
  description:
    'Validate access with a native read-only query and report the configured credential mode and region. This does not identify a human user; these APIs do not expose a documented self endpoint.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tokenType: z
        .enum(['master', 'user'])
        .describe('Saved credential mode; not a provider-issued identity claim'),
      region: z.string(),
      authorizationValidated: z.boolean(),
      identityAvailable: z.boolean(),
      validationQuery: z.enum(['get_users', 'get_solution_instances'])
    })
  )
  .handleInvocation(async ctx => {
    const credential = clientConfig(ctx),
      client = new TrayGraphqlClient(credential);
    const validationQuery =
      ctx.auth.tokenType === 'master' ? 'get_users' : 'get_solution_instances';
    if (ctx.auth.tokenType === 'master') await client.listUsers({}, { first: 1 });
    else await client.listSolutionInstances({ first: 1 });
    return {
      output: {
        tokenType: ctx.auth.tokenType,
        region: credential.region,
        authorizationValidated: true,
        identityAvailable: false,
        validationQuery
      },
      message:
        'The configured regional credential successfully authorized a native read. No human identity is inferred.'
    };
  })
  .build();
