import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let adhocExtraction = SlateTool.create(spec, {
  name: 'Ad-hoc Extraction',
  key: 'adhoc_extraction',
  description: `Extract data from a single webpage instantly without creating a persistent workflow.
Provide a URL and a schema ID (or use built-in modes like "html", "body", or "markdown" for raw content).
Useful for one-off data needs or testing extraction configurations.`,
  instructions: [
    'Use "markdown" as schemaId to get LLM-ready markdown content.',
    'Use "html" or "body" to get raw HTML content.',
    'Use a custom schema ID for structured data extraction.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      schemaId: z
        .string()
        .describe(
          'Schema ID for extraction, or use "html", "body", "markdown" for raw content'
        ),
      url: z.string().describe('URL of the webpage to extract data from'),
      locationType: z
        .enum(['auto', 'manual'])
        .optional()
        .describe('Location type for proxy routing'),
      locationIsoCode: z
        .string()
        .optional()
        .describe(
          'ISO country code for manual location. Call list_locations for available codes (e.g., "US", "DE")'
        )
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Extraction status (SUCCESS, NO_DATA, TIMEOUT, NETWORK_ERROR, ERROR)'),
      url: z.string().optional().describe('Extracted URL'),
      extractedData: z
        .any()
        .optional()
        .describe('Extracted data (structure depends on schema)'),
      screenshotUrl: z.string().optional().describe('Screenshot URL of the extracted page'),
      requestTimeMs: z.number().optional().describe('Request time in milliseconds'),
      message: z.string().optional().describe('Additional status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });

    if (ctx.input.locationType === 'manual' && !ctx.input.locationIsoCode) {
      throw createApiServiceError(
        'locationIsoCode is required when locationType is manual. Call list_locations for available country codes.'
      );
    }
    if (ctx.input.locationIsoCode && ctx.input.locationType !== 'manual') {
      throw createApiServiceError(
        'Set locationType to manual when providing locationIsoCode.'
      );
    }

    let location = ctx.input.locationType
      ? {
          type: ctx.input.locationType,
          isoCode: ctx.input.locationIsoCode
        }
      : undefined;

    let result = await client.runAdhocExtraction(ctx.input.schemaId, {
      link: ctx.input.url,
      location
    });

    return {
      output: {
        status: result.status,
        url: result.link ?? undefined,
        extractedData: result.data ?? undefined,
        screenshotUrl: result.screenshotUrl ?? undefined,
        requestTimeMs: result.requestTimeMs ?? undefined,
        message: result.message ?? undefined
      },
      message: `Ad-hoc extraction from **${ctx.input.url}** — status: **${result.status}**${result.requestTimeMs ? ` (${result.requestTimeMs}ms)` : ''}.`
    };
  })
  .build();
