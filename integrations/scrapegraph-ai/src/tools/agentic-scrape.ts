import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let agenticScrape = SlateTool.create(spec, {
  name: 'Agentic Scrape',
  key: 'agentic_scrape',
  description: `Automates browser interactions using a sequence of natural language steps before extracting data. Can click buttons, fill forms, type text, scroll, navigate, and log in to websites.
Supports session persistence for multi-step workflows and optional AI extraction with schema support. Without AI extraction, returns raw markdown.`,
  instructions: [
    'Describe each browser action as a plain language step (e.g., "Click the login button", "Type email@example.com in the email field").',
    'Enable useSession to persist the browser session across multiple requests for multi-step workflows.',
    'Set aiExtraction to true and provide a userPrompt to get structured data; otherwise returns raw markdown.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Target webpage URL to navigate to'),
      steps: z
        .array(z.string())
        .describe(
          'Sequence of browser actions described in natural language (e.g., "Click the Sign In button", "Type admin@example.com in the email field")'
        ),
      useSession: z
        .boolean()
        .optional()
        .describe('Maintain browser session across requests for multi-step workflows'),
      aiExtraction: z
        .boolean()
        .optional()
        .describe(
          'Enable AI-powered structured data extraction (default: false, returns raw markdown)'
        ),
      userPrompt: z
        .string()
        .optional()
        .describe('Instructions for AI extraction (required when aiExtraction is true)'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema for structured output (used with aiExtraction)')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this request'),
      status: z.string().describe('Status of the request'),
      result: z
        .unknown()
        .describe('Extracted data (structured JSON if AI extraction, raw markdown otherwise)'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.agenticScraper({
      url: ctx.input.url,
      steps: ctx.input.steps,
      useSession: ctx.input.useSession,
      aiExtraction: ctx.input.aiExtraction,
      userPrompt: ctx.input.userPrompt,
      outputSchema: ctx.input.outputSchema
    });

    return {
      output: {
        requestId: response.request_id,
        status: response.status,
        result: response.result,
        error: response.error
      },
      message: `Automated browser on **${ctx.input.url}** with **${ctx.input.steps.length}** step(s). Status: **${response.status}**.`
    };
  })
  .build();
