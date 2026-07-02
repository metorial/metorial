import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pagePerformance = SlateTool.create(spec, {
  name: 'Global Page Performance',
  key: 'global_page_performance',
  description: `Measure page load or API response time from a specified global geographic location. Simulates a browser page load from 20+ locations worldwide and returns the round-trip performance measurement in seconds.`,
  instructions: [
    'Choose an origin location like "Singapore", "Tokyo", "London", "New York", "Sydney", "Frankfurt", etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: z
        .string()
        .describe('Geographic origin location (e.g., "Singapore", "Tokyo", "London")'),
      url: z.string().describe('The URL to measure (e.g., "https://www.example.com")')
    })
  )
  .output(
    z.object({
      performanceData: z
        .record(z.string(), z.any())
        .describe(
          'Performance data including origin, response time in seconds, page response status, and content info'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getGlobalPageLoad(ctx.input.origin, ctx.input.url);

    return {
      output: {
        performanceData: result
      },
      message: `Measured load time for "${ctx.input.url}" from ${ctx.input.origin}`
    };
  })
  .build();
