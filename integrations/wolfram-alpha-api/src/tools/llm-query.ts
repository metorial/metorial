import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let llmQuery = SlateTool.create(spec, {
  name: 'LLM-Optimized Query',
  key: 'llm_query',
  description: `Submit a query and receive results in a text format optimized for consumption by large language models.
Returns computed answers, image URLs, and links back to the Wolfram Alpha website. Best for AI-assisted workflows that need structured textual results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Natural language query to compute'),
      maxChars: z.number().optional().describe('Maximum number of characters in the response'),
      units: z.enum(['metric', 'imperial']).optional().describe('Unit system for the result'),
      assumptions: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Assumption input tokens from a previous full_results_query response'),
      location: z
        .string()
        .optional()
        .describe('Location context; use only one of location, ip, or latLong'),
      ip: z
        .string()
        .optional()
        .describe('IP address context; use only one of location, ip, or latLong'),
      latLong: z
        .string()
        .optional()
        .describe('Latitude,longitude context; use only one of location, ip, or latLong')
    })
  )
  .output(
    z.object({
      llmResponse: z
        .string()
        .describe('LLM-optimized text response with computed answers and links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let llmResponse = await client.llmQuery({
      input: ctx.input.query,
      maxchars: ctx.input.maxChars,
      units: ctx.input.units ?? ctx.config.unitSystem,
      assumption: ctx.input.assumptions,
      location: ctx.input.location,
      ip: ctx.input.ip,
      latLong: ctx.input.latLong
    });

    let responseText = String(llmResponse);
    let truncated =
      responseText.length > 500 ? `${responseText.substring(0, 500)}...` : responseText;

    return {
      output: {
        llmResponse: responseText
      },
      message: `LLM-optimized result:\n\n${truncated}`
    };
  })
  .build();
