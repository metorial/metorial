import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeTeamMember = SlateTool.create(spec, {
  name: 'Remove Team Member',
  key: 'remove_team_member',
  description: `Remove a user from a team or revoke a pending team invitation. The user will no longer receive notifications sent to the team.

Requires an **account API key** for authentication and a **team API key** to identify the target team.`,
  constraints: [
    'Requires an account API key for authentication (not a team API key).',
    'This is a beta API feature.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      teamApiKey: z.string().describe('The team API key identifying the target team'),
      email: z
        .string()
        .describe('Email address of the user to remove or whose invite to revoke')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether the member was removed or invite was revoked successfully'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.removeTeamMember(ctx.input.teamApiKey, ctx.input.email);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: result.success
        ? `Removed **${ctx.input.email}** from team (or revoked pending invite).`
        : `Failed to remove user: ${result.message ?? result.error ?? 'Unknown error'}`
    };
  })
  .build();
