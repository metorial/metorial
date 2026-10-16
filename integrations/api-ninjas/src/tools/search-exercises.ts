import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchExercises = SlateTool.create(spec, {
  name: 'Search Exercises',
  key: 'search_exercises',
  description: `Search for exercises by name, type, target muscle, or difficulty level. Returns exercise details including instructions, equipment needed, and safety information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Results to skip for pagination; premium only'),
      equipments: z
        .string()
        .optional()
        .describe('Comma-separated equipment filter, such as dumbbell,flat bench'),
      name: z
        .string()
        .optional()
        .describe('Exercise name or partial name (e.g. "press", "squat")'),
      type: z
        .enum([
          'cardio',
          'olympic_weightlifting',
          'plyometrics',
          'powerlifting',
          'strength',
          'stretching',
          'strongman'
        ])
        .optional()
        .describe('Exercise type'),
      muscle: z
        .string()
        .optional()
        .describe(
          'Target muscle group (e.g. biceps, chest, quadriceps, hamstrings, abdominals)'
        ),
      difficulty: z
        .enum(['beginner', 'intermediate', 'expert'])
        .optional()
        .describe('Difficulty level')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      exercises: z
        .array(
          z.object({
            name: z.string().describe('Exercise name'),
            type: z.string().describe('Exercise type/category'),
            muscle: z.string().describe('Primary target muscle'),
            difficulty: z.string().describe('Difficulty level'),
            instructions: z.string().describe('How to perform the exercise'),
            equipment: z.string().optional().describe('Required equipment'),
            equipments: z.array(z.string()).optional().describe('Required equipment names'),
            safetyInfo: z.string().optional().describe('Safety guidance and movement cues')
          })
        )
        .describe('List of matching exercises')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.equipments !== undefined) params.equipments = ctx.input.equipments;
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.muscle) params.muscle = ctx.input.muscle;
    if (ctx.input.difficulty) params.difficulty = ctx.input.difficulty;

    let result = await client.getExercises(params);
    let exercises = Array.isArray(result) ? result : [result];

    let mapped = exercises.map((e: any) => ({
      name: e.name,
      type: e.type,
      muscle: e.muscle,
      difficulty: e.difficulty,
      instructions: e.instructions,
      equipment:
        typeof e.equipment === 'string'
          ? e.equipment
          : Array.isArray(e.equipments)
            ? e.equipments.join(', ')
            : undefined,
      equipments: e.equipments ?? undefined,
      safetyInfo: e.safety_info ?? undefined
    }));

    return {
      output: {
        raw: result,
        exercises: mapped
      },
      message: `Found **${mapped.length}** exercise(s)${ctx.input.muscle ? ` targeting **${ctx.input.muscle}**` : ''}.`
    };
  })
  .build();
