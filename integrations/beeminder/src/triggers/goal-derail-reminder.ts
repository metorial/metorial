import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { goalSchema, mapGoal } from '../lib/schemas';
import { spec } from '../spec';

export let goalDerailReminder = SlateTrigger.create(spec, {
  name: 'Goal Derail Reminder',
  key: 'goal_derail_reminder',
  description:
    'Receives webhook notifications when a Beeminder goal is about to derail. The webhook URL must be manually configured per-goal in Beeminder\'s goal settings (the "callback_url" field), or set via the Update Goal tool.'
})
  .input(
    z.object({
      goalSlug: z.string().describe('Slug of the goal that is about to derail'),
      goalData: z
        .record(z.string(), z.any())
        .describe('Full goal attributes from the webhook payload')
    })
  )
  .output(goalSchema)
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      return {
        inputs: [
          {
            goalSlug: data.slug as string,
            goalData: data as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let goal = mapGoal(ctx.input.goalData);

      return {
        type: 'goal.derail_reminder',
        id: `${ctx.input.goalSlug}_${ctx.input.goalData.losedate || Date.now()}`,
        output: goal
      };
    }
  })
  .build();
