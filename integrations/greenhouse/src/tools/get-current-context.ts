import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const getCurrentContextTool = SlateTool.create(spec, {
  key: 'get_current_context',
  name: 'Get Current Context',
  description:
    'Verify the current Harvest v3 token with its issuing client. Returns organization, token subject, granted scopes and current role when Greenhouse provides them. The subject may be an integration service account, rather than a person.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      active: z.boolean(),
      clientId: z.string(),
      subjectId: z.string().optional(),
      organizationId: z.string(),
      organizationName: z.string().optional(),
      userRole: z.string().nullable().optional(),
      scopes: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => ({
    output: await new GreenhouseClient(ctx.auth, ctx.config).getCurrentContext(),
    message: 'Verified the current Greenhouse connection.'
  }))
  .build();
