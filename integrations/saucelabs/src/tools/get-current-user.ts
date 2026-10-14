import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Sauce Labs user profile, including its stable user ID and team memberships.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Stable user UUID'),
      username: z.string().describe('Authenticated username'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      isActive: z.boolean().optional().describe('Whether the user account is active'),
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team UUID'),
            name: z.string().optional().describe('Team name')
          })
        )
        .optional()
        .describe('Team memberships')
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx).getCurrentUser();
    return {
      output: {
        userId: user.id,
        username: user.username,
        email: user.email ?? undefined,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        isActive: user.is_active ?? undefined,
        teams: user.teams?.map((team: { id: string; name?: string | null }) => ({
          teamId: team.id,
          name: team.name ?? undefined
        }))
      },
      message: `Authenticated as **${user.username}**.`
    };
  })
  .build();
