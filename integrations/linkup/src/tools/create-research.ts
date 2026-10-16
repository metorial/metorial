import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { researchTaskSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createResearch = SlateTool.create(spec, {
  name: 'Create Research',
  key: 'create_research',
  description:
    'Start an asynchronous web research task for a sourced report or structured JSON result. Returns a task ID; call get_research to retrieve status and the completed output.',
  instructions: [
    'Research runs asynchronously and can consume credits. Keep the returned ID and call get_research until status is completed or failed.',
    'Use answer for a precise question, investigate for one subject, or research for a broad report. Omit mode to let Linkup choose.',
    'Structured output requires structuredOutputSchema with JSON Schema root type object.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      query: z.string().min(1).describe('Research question, scope, and desired deliverable'),
      outputType: z.enum(['sourcedAnswer', 'structured']).default('sourcedAnswer'),
      structuredOutputSchema: z
        .string()
        .optional()
        .describe('JSON Schema string with root type object; required for structured output'),
      mode: z.enum(['answer', 'auto', 'investigate', 'research']).optional(),
      reasoningDepth: z
        .enum(['S', 'M', 'L', 'XL'])
        .optional()
        .describe('Research effort; larger depths take longer. Default L.'),
      fromDate: z
        .string()
        .optional()
        .describe('Earliest source date in YYYY-MM-DD format, after 1970-01-01'),
      toDate: z
        .string()
        .optional()
        .describe('Latest source date in YYYY-MM-DD format; later than fromDate'),
      includeDomains: z
        .array(z.string())
        .max(100)
        .optional()
        .describe('Restrict research to these domains'),
      excludeDomains: z.array(z.string()).optional().describe('Exclude these domains')
    })
  )
  .output(researchTaskSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createResearch(ctx.input);
    return {
      output: result,
      message: `Research task **${result.id}** is **${result.status}**. Call get_research with this ID to retrieve its result.`
    };
  })
  .build();
