import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryUrl = SlateTool.create(spec, {
  name: 'Query URL',
  key: 'query_url',
  description: `Ask a question about the content of a specific web page. The API fetches the page content and uses an LLM to answer the query based on that content.
Useful for extracting specific information from a known URL, summarizing articles, or answering questions about web page content.`,
  instructions: [
    'Provide a direct, accessible URL — the page must be publicly reachable.',
    'Be specific with the query to get focused answers from the page content.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to query'),
      query: z.string().describe('The question to ask about the page content'),
      model: z
        .enum(['gpt-4o-mini', 'gpt-4o', 'o3-mini-high', 'o3-mini-medium', 'gemini-2.0-flash'])
        .optional()
        .describe('LLM model to use'),
      responseLanguage: z
        .string()
        .optional()
        .describe('Language code for the response, or "auto" to detect from query'),
      answerType: z
        .enum(['text', 'markdown', 'html'])
        .optional()
        .describe('Format of the generated answer')
    })
  )
  .output(
    z.object({
      llmResponse: z.string().describe('The AI-generated answer based on the page content'),
      responseTime: z
        .number()
        .optional()
        .describe('Time taken to generate the response in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.queryFromUrl({
      url: ctx.input.url,
      query: ctx.input.query,
      model: ctx.input.model,
      responseLanguage: ctx.input.responseLanguage,
      answerType: ctx.input.answerType
    });

    return {
      output: result,
      message: `Answered "${ctx.input.query}" from ${ctx.input.url}.`
    };
  })
  .build();
