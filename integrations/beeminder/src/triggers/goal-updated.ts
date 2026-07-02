import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let goalUpdated = SlateTrigger.create(spec, {
  name: 'Goal Updated',
  key: 'goal_updated',
  description:
    '[Polling fallback] Polls for changes to Beeminder goals using the diff_since parameter. Detects goal updates including new datapoints, road changes, pledge changes, and status changes.'
})
  .input(
    z.object({
      goalSlug: z.string().describe('Slug of the updated goal'),
      updatedAt: z.number().describe('Unix timestamp of when the goal was updated'),
      goalData: z.record(z.string(), z.any()).describe('Full goal attributes')
    })
  )
  .output(goalSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BeeminderClient({
        token: ctx.auth.token,
        username: ctx.auth.username
      });

      let lastPoll = (ctx.state as any)?.lastPollTimestamp;

      let params: { diffSince?: number; skinny?: boolean } = {};
      if (lastPoll) {
        params.diffSince = lastPoll;
      }
      params.skinny = true;

      let user = await client.getUser(params);
      let now = Math.floor(Date.now() / 1000);

      let goals: any[] = user.goals || [];

      // When diff_since is used, only changed goals are returned
      let inputs = goals.map((g: any) => ({
        goalSlug: g.slug,
        updatedAt: g.updated_at || now,
        goalData: g
      }));

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: now
        }
      };
    },

    handleEvent: async ctx => {
      let goal = mapGoal(ctx.input.goalData);

      return {
        type: 'goal.updated',
        id: `${ctx.input.goalSlug}_${ctx.input.updatedAt}`,
        output: goal
      };
    }
  })
  .build();
