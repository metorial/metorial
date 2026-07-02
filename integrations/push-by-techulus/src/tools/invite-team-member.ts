import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inviteTeamMember = SlateTool.create(spec, {
  name: 'Invite Team Member',
  key: 'invite_team_member',
  description: `Invite a user to a team by email. Once the user accepts the invite, they will receive all future notifications sent to the team.

Requires an **account API key** for authentication and a **team API key** to identify the target team.`,
  constraints: [
    'Requires an account API key for authentication (not a team API key).',
    'This is a beta API feature.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamApiKey: z.string().describe('The team API key identifying the target team'),
      email: z.string().describe('Email address of the user to invite')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invitation was sent successfully'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.inviteTeamMember(ctx.input.teamApiKey, ctx.input.email);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: result.success
        ? `Invitation sent to **${ctx.input.email}**.`
        : `Failed to invite user: ${result.message ?? result.error ?? 'Unknown error'}`
    };
  })
  .build();
