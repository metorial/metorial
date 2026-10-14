import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Get the authenticated Seqera user and their default workspace ID.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Authenticated user ID'),
      userName: z.string().optional(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      organization: z.string().optional(),
      defaultWorkspaceId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    });
    let { user, defaultWorkspaceId } = await client.getUserInfo();
    return {
      output: {
        userId: user.id,
        userName: user.userName ?? undefined,
        email: user.email ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        organization: user.organization ?? undefined,
        defaultWorkspaceId: defaultWorkspaceId ?? undefined
      },
      message: `Authenticated as **${user.userName ?? user.id}**.`
    };
  })
  .build();
