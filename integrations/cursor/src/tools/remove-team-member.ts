import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let removeTeamMember = SlateTool.create(spec, {
  name: 'Remove Team Member',
  key: 'remove_team_member',
  description: `Remove a member from the team. Requires an Admin API key with Enterprise access. Provide either the member's email or encoded user ID.`,
  constraints: [
    'At least one paid member and one admin must remain on the team.',
    'Enterprise only.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email of the member to remove'),
      userId: z.string().optional().describe('Encoded user ID of the member to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful'),
      userId: z.string().describe('ID of the removed user'),
      hasBillingCycleUsage: z
        .boolean()
        .describe('Whether the user had usage in the current billing cycle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.removeMember({
      email: ctx.input.email,
      userId: ctx.input.userId
    });

    return {
      output: {
        success: result.success,
        userId: result.userId,
        hasBillingCycleUsage: result.hasBillingCycleUsage
      },
      message: `Member **${ctx.input.email ?? ctx.input.userId}** has been removed from the team.${result.hasBillingCycleUsage ? ' Note: user had usage in the current billing cycle.' : ''}`
    };
  })
  .build();
