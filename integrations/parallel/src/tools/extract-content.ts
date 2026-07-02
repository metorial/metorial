import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Content',
  key: 'extract_content',
  description: `Extract and retrieve content from specific URLs. Provide one or more URLs with an optional objective to focus extraction on relevant information.
Returns excerpts and/or full content from the target pages.`,
  instructions: [
    'Provide an objective to extract only relevant sections rather than full page content.',
    'Enable fullContent to retrieve the complete page content in markdown format.',
    'Up to 10 URLs can be processed in a single request.'
  ],
  constraints: [
    'Maximum 10 URLs per request.',
    'Objective text is limited to 3000 characters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z.array(z.string()).describe('URLs to extract content from (max 10)'),
      objective: z
        .string()
        .optional()
        .describe('Focus extraction on this intent (max 3000 chars)'),
      searchQueries: z
        .array(z.string())
        .optional()
        .describe('Keyword queries to focus extraction'),
      excerpts: z
        .union([
          z.boolean(),
          z.object({
            maxCharsPerResult: z.number().optional().describe('Max chars per result excerpt'),
            maxCharsTotal: z
              .number()
              .optional()
              .describe('Max total chars across all excerpts')
          })
        ])
        .optional()
        .describe('Whether to return excerpts, or excerpt length settings. Defaults to true.'),
      fullContent: z
        .union([
          z.boolean(),
          z.object({
            maxCharsPerResult: z
              .number()
              .optional()
              .describe('Max chars per result full content'),
            maxCharsTotal: z
              .number()
              .optional()
              .describe('Max total chars across all full content')
          })
        ])
        .optional()
        .describe('Whether to return full page content. Defaults to false.')
    })
  )
  .output(
    z.object({
      extractId: z.string().describe('Unique identifier for this extraction'),
      results: z
        .array(
          z.object({
            url: z.string().describe('URL that was extracted'),
            title: z.string().nullable().describe('Page title or null'),
            publishDate: z
              .string()
              .nullable()
              .describe('Publication date (YYYY-MM-DD) or null'),
            excerpts: z.array(z.string()).nullable().describe('Extracted excerpts or null'),
            fullContent: z
              .string()
              .nullable()
              .describe('Full page content in markdown or null')
          })
        )
        .describe('Successfully extracted content'),
      errors: z
        .array(
          z.object({
            url: z.string().describe('URL that failed'),
            errorType: z.string().describe('Type of error encountered'),
            httpStatusCode: z.number().nullable().describe('HTTP status code or null'),
            content: z.string().nullable().describe('Error details or null')
          })
        )
        .describe('URLs that failed to extract'),
      warnings: z.array(z.string()).nullable().describe('Any warnings from the extraction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.extract({
      urls: ctx.input.urls,
      objective: ctx.input.objective,
      searchQueries: ctx.input.searchQueries,
      excerpts: ctx.input.excerpts,
      fullContent: ctx.input.fullContent
    });

    let successCount = result.results.length;
    let errorCount = result.errors.length;
    let parts = [
      `Extracted content from **${successCount}** URL${successCount !== 1 ? 's' : ''}`
    ];
    if (errorCount > 0) {
      parts.push(`${errorCount} failed`);
    }
    return {
      output: result,
      message: `${parts.join(', ')}.`
    };
  })
  .build();
