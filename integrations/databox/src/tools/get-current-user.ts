import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieves the authenticated Databox user and their organization and optional account identity. Uses the current profile endpoint independently of the selected data API version; it does not return the API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      name: z.string(),
      email: z.string().optional(),
      timezone: z.string().optional(),
      role: z.string().optional(),
      organization: z.object({ id: z.number(), name: z.string() }),
      account: z.object({ id: z.number(), name: z.string() }).nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    }).getCurrentUser();
    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        role: user.role,
        organization: user.organization,
        account: user.account
      },
      message: 'Retrieved the authenticated Databox identity.'
    };
  })
  .build();
