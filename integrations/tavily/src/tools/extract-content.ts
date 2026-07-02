import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Content',
  key: 'extract_content',
  description: `Extract clean, structured content from one or more URLs. Returns full page content in markdown or plain text format. Supports query-based reranking to surface the most relevant content chunks, and optional image extraction.`,
  instructions: [
    'Provide a query to rerank extracted content chunks by relevance to your question.',
    'Use "advanced" extractDepth to retrieve more data including tables and embedded content.'
  ],
  constraints: [
    'Maximum 20 URLs per request.',
    'Basic extraction defaults to 10s timeout, advanced to 30s. Custom timeout range is 1-60 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z.array(z.string()).min(1).max(20).describe('URLs to extract content from (1-20)'),
      query: z
        .string()
        .optional()
        .describe('Query to rerank extracted content chunks by relevance'),
      chunksPerSource: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Max relevant chunks per source (1-5). Requires a query'),
      extractDepth: z
        .enum(['basic', 'advanced'])
        .optional()
        .describe('Extraction depth. "advanced" retrieves tables and embedded content'),
      includeImages: z.boolean().optional().describe('Include images found on the pages'),
      format: z
        .enum(['markdown', 'text'])
        .optional()
        .describe('Output format for extracted content. Defaults to "markdown"'),
      timeout: z
        .number()
        .min(1)
        .max(60)
        .optional()
        .describe('Maximum seconds before timeout (1-60)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            url: z.string().describe('Source URL'),
            rawContent: z.string().describe('Full extracted content'),
            images: z.array(z.string()).optional().describe('Image URLs found on the page'),
            favicon: z.string().optional().describe('Favicon URL')
          })
        )
        .describe('Successfully extracted pages'),
      failedResults: z
        .array(
          z.object({
            url: z.string().describe('URL that failed extraction'),
            error: z.string().describe('Error message')
          })
        )
        .describe('URLs that could not be extracted'),
      responseTime: z.number().describe('Time to complete the request in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.extract({
      urls: ctx.input.urls,
      query: ctx.input.query,
      chunksPerSource: ctx.input.chunksPerSource,
      extractDepth: ctx.input.extractDepth,
      includeImages: ctx.input.includeImages,
      format: ctx.input.format,
      timeout: ctx.input.timeout
    });

    let successCount = result.results.length;
    let failedCount = result.failedResults.length;

    return {
      output: {
        results: result.results,
        failedResults: result.failedResults,
        responseTime: result.responseTime
      },
      message: `Extracted content from **${successCount}** URL${successCount !== 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''} in ${result.responseTime.toFixed(2)}s.`
    };
  })
  .build();
