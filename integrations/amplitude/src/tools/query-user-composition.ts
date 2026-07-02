import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
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
  .input(
    z.object({
      property: z
        .string()
        .describe(
          'User property to analyze the distribution of (e.g., "country", "platform", "plan").'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.')
    })
  )
  .output(
    z.object({
      compositionData: z.any().describe('User property distribution data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getUserComposition({
      start: ctx.input.start,
      end: ctx.input.end,
      p: ctx.input.property
    });

    return {
      output: { compositionData: result.data ?? result },
      message: `Retrieved user composition for property "${ctx.input.property}" from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
