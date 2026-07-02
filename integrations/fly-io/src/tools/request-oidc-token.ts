import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let requestOidcToken = SlateTool.create(spec, {
  name: 'Request OIDC Token',
  key: 'request_oidc_token',
  description: `Request an OpenID Connect (OIDC) JWT token for a Machine. This enables Fly Machines to authenticate with external third-party services that accept OIDC tokens.`,
  instructions: [
    'Set the audience (aud) claim to identify the recipient service for the token.'
  ]
})
  .input(
    z.object({
      audience: z
        .string()
        .optional()
        .describe(
          'Audience claim (aud) for the token — identifies the intended recipient service'
        )
    })
  )
  .output(
    z.object({
      oidcToken: z.string().describe('OIDC JWT token')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let token = await client.requestOidcToken(ctx.input.audience);

    return {
      output: { oidcToken: token },
      message: `Generated OIDC token${ctx.input.audience ? ` for audience **${ctx.input.audience}**` : ''}.`
    };
  })
  .build();
