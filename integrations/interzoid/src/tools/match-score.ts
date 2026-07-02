import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let matchScore = SlateTool.create(spec, {
  name: 'Match Score',
  key: 'match_score',
  description: `Compare two values and receive a match score (0–100) indicating the likelihood they refer to the same entity. Supports **organization names** and **individual full names**.

A score of 100 indicates the highest possible match; lower scores indicate less similarity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: z.enum(['organization', 'full_name']).describe('The type of data to compare'),
      value1: z.string().describe('First value to compare'),
      value2: z.string().describe('Second value to compare')
    })
  )
  .output(
    z.object({
      score: z.string().describe('Match score from 0–100'),
      code: z.string().describe('API response status code'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: { Score: string; Code: string; Credits: number };

    if (ctx.input.category === 'organization') {
      result = await client.getOrgMatchScore(ctx.input.value1, ctx.input.value2);
    } else {
      result = await client.getFullNameMatchScore(ctx.input.value1, ctx.input.value2);
    }

    return {
      output: {
        score: result.Score,
        code: result.Code,
        remainingCredits: result.Credits
      },
      message: `Match score between "${ctx.input.value1}" and "${ctx.input.value2}": **${result.Score}/100**`
    };
  })
  .build();
