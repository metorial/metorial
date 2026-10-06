import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptOutput, SerpApiClient } from '../lib/client';
import { requireValue, searchId, searchMetadataSchema } from '../lib/contracts';
import { spec } from '../spec';

export const getSearchTool = SlateTool.create(spec, {
  key: 'get_search',
  name: 'Get Search',
  description:
    'Retrieve the exact native search archive by ID, including queued/processing status or completed results. Optionally provide a downloadable completed JSON or HTML file. Archives are available for up to 31 days after completion; this read does not resubmit a paid search.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchId: z.string().describe('Exact native search ID returned by a search submission.'),
      downloadFormat: z
        .enum(['json', 'html'])
        .optional()
        .describe(
          'Provide a downloadable completed archive file. Requires native Success status.'
        )
    })
  )
  .output(
    z.object({
      searchMetadata: searchMetadataSchema,
      isComplete: z.boolean(),
      pagination: z.record(z.string(), z.unknown()).optional(),
      searchParameters: z.record(z.string(), z.unknown()).optional(),
      error: z.string().optional().describe('Native failed archive message, when present.'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Native completed search result; absent while queued or processing.'),
      fileProvided: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const id = searchId(ctx.input.searchId);
    const data = await new SerpApiClient({
      apiKey: ctx.auth.token,
      accountId: ctx.auth.accountId
    }).getSearch(id);
    const complete = data.search_metadata.status === 'Success';
    if (ctx.input.downloadFormat) {
      requireValue(
        complete,
        `Search ${id} is ${data.search_metadata.status}; no completed file is available yet. Read this ID again rather than resubmitting the query.`
      );
      await ctx.addAttachment({
        type: 'url',
        url: `https://serpapi.com/searches/${id}.${ctx.input.downloadFormat}`,
        query: { api_key: ctx.auth.token },
        filename: `search-${id}.${ctx.input.downloadFormat}`,
        mimeType: ctx.input.downloadFormat === 'json' ? 'application/json' : 'text/html'
      });
    }
    return {
      output: {
        ...receiptOutput(data),
        searchParameters: data.search_parameters,
        error: typeof data.error === 'string' ? data.error : undefined,
        result: complete && !ctx.input.downloadFormat ? data : undefined,
        fileProvided: Boolean(ctx.input.downloadFormat)
      },
      message: `Search ${id} is ${data.search_metadata.status}.${ctx.input.downloadFormat ? ' Completed file is available to download.' : ''}`
    };
  })
  .build();
