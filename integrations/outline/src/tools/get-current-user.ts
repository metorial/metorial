import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { mapUser, userOutput } from '../lib/schemas';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the actual authenticated Outline user and workspace for the bound instance.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: userOutput,
      team: z.object({ teamId: z.string(), name: z.string(), url: z.string().optional() }),
      baseUrl: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const identity = await client.getIdentity();
    return {
      output: {
        user: mapUser(identity.user),
        team: { teamId: identity.team.id, name: identity.team.name, url: identity.team.url },
        baseUrl: client.baseUrl
      },
      message: 'Retrieved the authenticated user and workspace.'
    };
  })
  .build();
