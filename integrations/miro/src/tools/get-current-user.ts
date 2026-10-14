import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieves the connected Miro user and authorized team from the current access token context.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Connected user ID'),
      name: z.string().optional().describe('Connected user name'),
      teamId: z
        .string()
        .optional()
        .describe('Authorized team ID for creating or filtering boards'),
      teamName: z.string().optional().describe('Authorized team name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let context = await client.getCurrentUser();
    let userId = context.user?.id?.toString() ?? ctx.auth.userId;
    if (!userId)
      throw createApiServiceError(
        'Miro did not return the connected user ID. Reconnect your account.'
      );
    return {
      output: {
        userId,
        name: context.user?.name ?? undefined,
        teamId: context.team?.id?.toString() ?? ctx.auth.teamId,
        teamName: context.team?.name ?? undefined
      },
      message: `Retrieved the connected Miro user ${userId}.`
    };
  })
  .build();
