import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export let getCurrentContext = SlateTool.create(spec, {
  key: 'get_current_context',
  name: 'Get Current Context',
  description:
    'Validate the connected bearer token and report its SAP API server and remaining expiry. SAP’s validation endpoint does not identify the authenticated person or company; the configured company ID is reported separately.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tokenValid: z.literal(true),
      apiServerUrl: z.string(),
      tokenType: z.literal('Bearer'),
      expiresAt: z.string(),
      configuredCompanyId: z
        .string()
        .describe(
          'Configured company sign-in ID; not an identity claim returned by token validation.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let context = await new Client(ctx.auth).validateToken();
    return {
      output: { ...context, configuredCompanyId: ctx.auth.companyId },
      message: 'Validated the current bearer token.'
    };
  })
  .build();
