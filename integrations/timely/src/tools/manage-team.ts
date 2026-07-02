import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create or update a team in Timely. Provide a **teamId** to update an existing team, or omit it to create a new one.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Team ID to update. Omit to create a new team'),
      name: z.string().describe('Team name'),
      color: z.string().optional().describe('Color hex code'),
      userIds: z.array(z.number()).optional().describe('User IDs to assign to the team')
    })
  )
  .output(
    z.object({
      teamId: z.number().describe('Team ID'),
      name: z.string().describe('Team name'),
      color: z.string().nullable().describe('Color hex code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let result: any;
    let action: string;

    if (ctx.input.teamId) {
      result = await client.updateTeam(ctx.input.teamId, {
        name: ctx.input.name,
        color: ctx.input.color,
        userIds: ctx.input.userIds
      });
      action = 'Updated';
    } else {
      result = await client.createTeam({
        name: ctx.input.name,
        color: ctx.input.color,
        userIds: ctx.input.userIds
      });
      action = 'Created';
    }

    return {
      output: {
        teamId: result.id,
        name: result.name,
        color: result.color ?? null
      },
      message: `${action} team **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
