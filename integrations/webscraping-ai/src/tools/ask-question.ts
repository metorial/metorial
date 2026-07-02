import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scrapingOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let askQuestion = SlateTool.create(spec, {
  name: 'Ask Question About Page',
  key: 'ask_question',
  description: `Ask a natural language question about any webpage and receive an AI-generated answer as plain text. The AI reads the page content and provides a direct answer without requiring HTML parsing.
Useful for extracting specific insights, facts, or summaries from webpage content.`,
  instructions: [
    'Provide a clear, specific question for best results.',
    'The AI analyzes the full page content to generate an answer.'
  ],
  constraints: ['Costs 5 API credits per request plus proxy costs.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the webpage to analyze.'),
      question: z
        .string()
        .describe(
          'A natural language question about the page content, e.g. "What is the main topic?" or "What is the price of the product?"'
        ),
      ...scrapingOptionsSchema
    })
  )
  .output(
    z.object({
      answer: z.string().describe('The AI-generated answer to the question.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let answer = await client.askQuestion({
      url: ctx.input.url,
      question: ctx.input.question,
      js: ctx.input.js,
      jsTimeout: ctx.input.jsTimeout,
      timeout: ctx.input.timeout,
      waitFor: ctx.input.waitFor,
      proxy: ctx.input.proxy,
      country: ctx.input.country,
      device: ctx.input.device,
      headers: ctx.input.headers,
      jsScript: ctx.input.jsScript,
      customProxy: ctx.input.customProxy,
      errorOn404: ctx.input.errorOn404,
      errorOnRedirect: ctx.input.errorOnRedirect
    });

    return {
      output: { answer },
      message: `**Question:** ${ctx.input.question}\n\n**Answer:** ${answer}`
    };
  })
  .build();
