import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractData = SlateTool.create(spec, {
  name: 'Extract Structured Data',
  key: 'extract_data',
  description:
    'Extract structured data from a webpage, HTML, or Markdown using the current ScrapeGraphAI API and a natural language prompt. Optionally constrain the result with a JSON schema.',
  instructions: [
    'Requires a current API key from scrapegraphai.com; keys issued for the legacy v1 API are not accepted.',
    'Provide exactly one of url, html, or markdown. Raw HTML and Markdown sources may be up to 2 MB.',
    'Use generate_schema to create a schema, then pass it as schema here.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the webpage to extract from'),
      html: z
        .string()
        .optional()
        .describe('Raw HTML source; mutually exclusive with url and markdown'),
      markdown: z
        .string()
        .optional()
        .describe('Markdown source; mutually exclusive with url and html'),
      prompt: z.string().describe('Describe the data to extract'),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema for the extracted data'),
      mode: z
        .enum(['normal', 'reader', 'prune'])
        .optional()
        .describe('HTML preprocessing mode')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Request identifier for this extraction'),
      result: z.unknown().describe('Structured extracted data'),
      raw: z.string().nullable().optional().describe('Raw model response when available'),
      usage: z.object({ promptTokens: z.number(), completionTokens: z.number() }).optional(),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Fetch and extraction diagnostics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.extract(ctx.input);
    return {
      output: {
        requestId: response.id,
        result: response.json,
        raw: response.raw,
        usage: response.usage,
        metadata: response.metadata
      },
      message: `Extracted structured data. Request **${response.id}**.`
    };
  })
  .build();
