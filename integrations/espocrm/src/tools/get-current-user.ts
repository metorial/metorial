import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated EspoCRM user and retrieve their profile and team IDs.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('ID of the authenticated user'),
      userName: z.string().optional().describe('Login name'),
      name: z.string().optional().describe('Display name'),
      emailAddress: z.string().optional().describe('Primary email address'),
      type: z.string().optional().describe('User type, such as regular or api'),
      isActive: z.boolean().optional().describe('Whether the user is active'),
      teamIds: z.array(z.string()).optional().describe("IDs of the user's teams")
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx).getCurrentUser();
    return {
      output: {
        userId: user.id,
        userName: user.userName ?? undefined,
        name: user.name ?? undefined,
        emailAddress: user.emailAddress ?? undefined,
        type: user.type ?? undefined,
        isActive: user.isActive ?? undefined,
        teamIds: user.teamsIds ?? undefined
      },
      message: `Authenticated as **${user.name || user.userName || user.id}**.`
    };
  })
  .build();
