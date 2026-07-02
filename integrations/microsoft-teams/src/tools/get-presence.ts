import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

export let getPresence = SlateTool.create(spec, {
  name: 'Get Presence',
  key: 'get_presence',
  description: `Get the presence status (availability and activity) of one or more users in Microsoft Teams. Can query the authenticated user's own presence or other users by their IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIds: z
        .array(z.string())
        .optional()
        .describe(
          "User IDs to get presence for. If empty, returns the authenticated user's presence."
        )
    })
  )
  .output(
    z.object({
      presences: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          availability: z
            .string()
            .describe('Availability status (e.g., Available, Busy, Away, Offline)'),
          activity: z
            .string()
            .describe('Activity status (e.g., InACall, InAMeeting, Presenting)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (!ctx.input.userIds || ctx.input.userIds.length === 0) {
      let presence = await client.getMyPresence();
      return {
        output: {
          presences: [
            {
              userId: presence.id,
              availability: presence.availability,
              activity: presence.activity
            }
          ]
        },
        message: `Your presence: **${presence.availability}** (${presence.activity}).`
      };
    }

    if (ctx.input.userIds.length === 1) {
      let presence = await client.getPresence(ctx.input.userIds[0] as string);
      return {
        output: {
          presences: [
            {
              userId: presence.id,
              availability: presence.availability,
              activity: presence.activity
            }
          ]
        },
        message: `User presence: **${presence.availability}** (${presence.activity}).`
      };
    }

    let presences = await client.getPresenceBulk(ctx.input.userIds);
    let mapped = presences.map((p: any) => ({
      userId: p.id,
      availability: p.availability,
      activity: p.activity
    }));

    return {
      output: { presences: mapped },
      message: `Retrieved presence for **${mapped.length}** users.`
    };
  })
  .build();
