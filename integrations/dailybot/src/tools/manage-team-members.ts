import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let manageTeamMembers = SlateTool.create(spec, {
  name: 'Manage Team Members',
  key: 'manage_team_members',
  description: `Add or remove users from a team. Provide user UUIDs to add and/or remove in a single operation.`,
  instructions: ['Provide at least one of addUserUuids or removeUserUuids.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamUuid: z.string().describe('UUID of the team to manage'),
      addUserUuids: z
        .array(z.string())
        .optional()
        .describe('UUIDs of users to add to the team'),
      removeUserUuids: z
        .array(z.string())
        .optional()
        .describe('UUIDs of users to remove from the team')
    })
  )
  .output(
    z.object({
      addedCount: z.number().describe('Number of users added to the team'),
      removedCount: z.number().describe('Number of users removed from the team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let addedCount = 0;
    let removedCount = 0;

    if (ctx.input.addUserUuids && ctx.input.addUserUuids.length > 0) {
      await client.addTeamMembers(ctx.input.teamUuid, ctx.input.addUserUuids);
      addedCount = ctx.input.addUserUuids.length;
    }

    if (ctx.input.removeUserUuids && ctx.input.removeUserUuids.length > 0) {
      for (let userUuid of ctx.input.removeUserUuids) {
        await client.removeTeamMember(ctx.input.teamUuid, userUuid);
        removedCount++;
      }
    }

    return {
      output: { addedCount, removedCount },
      message: `Added **${addedCount}** and removed **${removedCount}** member(s) from team \`${ctx.input.teamUuid}\`.`
    };
  })
  .build();
