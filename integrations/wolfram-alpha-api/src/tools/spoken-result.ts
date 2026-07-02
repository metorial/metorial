import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let spokenResult = SlateTool.create(spec, {
  name: 'Spoken Result',
  key: 'spoken_result',
  description: `Get a natural language sentence phrasing the computed answer, designed for text-to-speech applications or conversational interfaces.
Returns a human-readable sentence rather than raw data (e.g., "The population of France is approximately 67 million people.").`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Natural language query to answer in spoken form'),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for the answer'),
      timeout: z.number().optional().describe('Query timeout in seconds')
    })
  )
  .output(
    z.object({
      spokenAnswer: z.string().describe('The spoken natural language answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let spokenAnswer = await client.spokenResult({
      input: ctx.input.query,
      units: ctx.input.units ?? ctx.config.unitSystem,
      timeout: ctx.input.timeout
    });

    return {
      output: {
        spokenAnswer: String(spokenAnswer)
      },
      message: `**Spoken answer:** "${spokenAnswer}"`
    };
  })
  .build();
