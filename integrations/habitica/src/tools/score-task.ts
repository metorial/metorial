import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let scoreTask = SlateTool.create(spec, {
  name: 'Score Task',
  key: 'score_task',
  description: `Score a task up or down in Habitica. For **Habits**, this clicks the + or - button. For **Dailies** and **To-Dos**, scoring up marks them complete and scoring down marks them incomplete.
Scoring affects the user's stats (HP, XP, Gold, Mana) based on task value and difficulty.`,
  instructions: [
    'Use direction "up" to complete a Daily/To-Do or click + on a Habit.',
    'Use direction "down" to uncomplete a Daily/To-Do or click - on a Habit.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to score'),
      direction: z
        .enum(['up', 'down'])
        .describe(
          'Scoring direction: "up" for positive/complete, "down" for negative/uncomplete'
        )
    })
  )
  .output(
    z.object({
      hp: z.number().optional().describe('Updated HP after scoring'),
      mp: z.number().optional().describe('Updated Mana after scoring'),
      exp: z.number().optional().describe('Updated experience after scoring'),
      gp: z.number().optional().describe('Updated gold after scoring'),
      lvl: z.number().optional().describe('Updated level after scoring'),
      delta: z.number().optional().describe('Change in task value')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let result = await client.scoreTask(ctx.input.taskId, ctx.input.direction);

    return {
      output: {
        hp: result.hp,
        mp: result.mp,
        exp: result.exp,
        gp: result.gp,
        lvl: result.lvl,
        delta: result.delta
      },
      message: `Scored task **${ctx.input.direction}**. Delta: **${result.delta?.toFixed(2)}**, HP: **${result.hp?.toFixed(1)}**, XP: **${result.exp?.toFixed(0)}**, Gold: **${result.gp?.toFixed(2)}**`
    };
  })
  .build();
