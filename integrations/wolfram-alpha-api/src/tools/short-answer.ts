import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shortAnswer = SlateTool.create(spec, {
  name: 'Short Answer',
  key: 'short_answer',
  description: `Get a concise, single-line plaintext answer to a factual query.
Ideal for quick lookups where you need a direct answer without additional context or structured data (e.g., "distance from Earth to Moon", "boiling point of water").`,
  constraints: ['Queries that cannot produce a short answer will return an error.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Natural language query to answer (e.g., "How tall is the Eiffel Tower?")'),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for the answer'),
      timeout: z.number().optional().describe('Query timeout in seconds')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('The plaintext short answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let answer = await client.shortAnswer({
      input: ctx.input.query,
      units: ctx.input.units ?? ctx.config.unitSystem,
      timeout: ctx.input.timeout
    });

    return {
      output: {
        answer: String(answer)
      },
      message: `**Answer:** ${answer}`
    };
  })
  .build();
