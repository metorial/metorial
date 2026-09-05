import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { dashboardDataSchema, parseResponse } from '../lib/rest-validation';
import { spec } from '../spec';

export let queryUserCompositionTool = SlateTool.create(spec, {
  name: 'Query User Composition',
  key: 'query_user_composition',
  description: `Analyze the distribution of a user property across your active users. Returns how many users have each value of the specified property (e.g., country breakdown, platform split, plan type distribution).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      property: z
        .string()
        .describe(
          'User property to analyze (for example country or platform). Prefix custom properties with gp:, for example gp:plan.'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.')
    })
  )
  .output(
    z.object({
      compositionData: z.unknown().describe('User property distribution data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    let result = await client.getUserComposition({
      start: ctx.input.start,
      end: ctx.input.end,
      p: ctx.input.property
    });

    return {
      output: {
        compositionData: parseResponse(dashboardDataSchema, result.data, 'analytics query')
      },
      message: `Retrieved user composition for property "${ctx.input.property}" from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
