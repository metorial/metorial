import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Performs AI-powered web searches using a natural language prompt and aggregates structured results from multiple web sources with source attribution.
Two modes: **AI Extraction** (structured data, higher cost) and **Markdown Mode** (raw content, lower cost). Supports geo-targeted search and time range filtering.`,
  instructions: [
    'Set extractionMode to false for cheaper markdown-only results without AI processing.',
    'Use timeRange to filter results by recency (e.g., "past_hour", "past_24_hours", "past_week", "past_month", "past_year").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userPrompt: z
        .string()
        .describe('Natural language search query describing what information to find'),
      numResults: z
        .number()
        .optional()
        .describe('Number of websites to search (3-20, default: 3)'),
      extractionMode: z
        .boolean()
        .optional()
        .describe(
          'true for AI extraction (structured data), false for raw markdown mode (lower cost). Default: true'
        ),
      locationGeoCode: z
        .string()
        .optional()
        .describe('ISO country code for geo-targeted search (e.g., "us", "gb")'),
      timeRange: z
        .enum(['past_hour', 'past_24_hours', 'past_week', 'past_month', 'past_year'])
        .optional()
        .describe('Filter results by time range'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON schema defining the structure of the expected output')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this search request'),
      status: z.string().describe('Status of the request'),
      result: z.unknown().describe('Search results (structured data or markdown content)'),
      referenceUrls: z
        .array(z.string())
        .optional()
        .describe('Source URLs where information was found'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.searchScraper({
      userPrompt: ctx.input.userPrompt,
      numResults: ctx.input.numResults,
      extractionMode: ctx.input.extractionMode,
      locationGeoCode: ctx.input.locationGeoCode,
      timeRange: ctx.input.timeRange,
      outputSchema: ctx.input.outputSchema
    });

    return {
      output: {
        requestId: response.request_id,
        status: response.status,
        result: response.result,
        referenceUrls: response.reference_urls,
        error: response.error
      },
      message: `Searched the web for: "${ctx.input.userPrompt}". Status: **${response.status}**. Found results from **${(response.reference_urls || []).length}** source(s).`
    };
  })
  .build();
