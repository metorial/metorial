import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _downloadLinksSchema = z
  .object({
    pages: z
      .array(z.string())
      .optional()
      .describe('Array of download URLs for individual pages.'),
    allPages: z.string().optional().describe('Download URL for all pages combined.')
  })
  .optional();

export let collectionCompleted = SlateTrigger.create(spec, {
  name: 'Collection Completed',
  key: 'collection_completed',
  description:
    'Triggers when a bulk request collection completes and a new result set is available for download. The collection must have its notification_webhook configured to point at this trigger.'
})
  .input(
    z.object({
      collectionId: z.string().describe('The collection ID.'),
      collectionName: z.string().describe('The collection name.'),
      resultSetId: z.number().describe('The result set ID.'),
      startedAt: z.string().describe('ISO 8601 timestamp when the collection run started.'),
      endedAt: z.string().describe('ISO 8601 timestamp when the collection run ended.'),
      requestsCompleted: z.number().describe('Number of requests completed.'),
      requestsFailed: z.number().describe('Number of requests that failed.'),
      downloadLinks: z
        .any()
        .optional()
        .describe('Download links for results in JSON, JSON Lines, and/or CSV.')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('The collection ID.'),
      collectionName: z.string().describe('The collection name.'),
      resultSetId: z.number().describe('The result set ID.'),
      startedAt: z.string().describe('ISO 8601 timestamp when the collection run started.'),
      endedAt: z.string().describe('ISO 8601 timestamp when the collection run ended.'),
      requestsCompleted: z.number().describe('Number of requests completed successfully.'),
      requestsFailed: z.number().describe('Number of requests that failed.'),
      jsonDownloadUrl: z
        .string()
        .optional()
        .describe('Download URL for JSON results (all pages).'),
      jsonlinesDownloadUrl: z
        .string()
        .optional()
        .describe('Download URL for JSON Lines results (all pages).'),
      csvDownloadUrl: z
        .string()
        .optional()
        .describe('Download URL for CSV results (all pages).')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let collection = body.collection || {};
      let resultSet = body.result_set || {};
      let downloadLinks = resultSet.download_links || {};

      return {
        inputs: [
          {
            collectionId: collection.id || '',
            collectionName: collection.name || '',
            resultSetId: resultSet.id || 0,
            startedAt: resultSet.started_at || '',
            endedAt: resultSet.ended_at || '',
            requestsCompleted: resultSet.requests_completed || 0,
            requestsFailed: resultSet.requests_failed || 0,
            downloadLinks
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { downloadLinks } = ctx.input;
      let links = downloadLinks || ({} as any);

      return {
        type: 'collection.completed',
        id: `${ctx.input.collectionId}-${ctx.input.resultSetId}`,
        output: {
          collectionId: ctx.input.collectionId,
          collectionName: ctx.input.collectionName,
          resultSetId: ctx.input.resultSetId,
          startedAt: ctx.input.startedAt,
          endedAt: ctx.input.endedAt,
          requestsCompleted: ctx.input.requestsCompleted,
          requestsFailed: ctx.input.requestsFailed,
          jsonDownloadUrl: links.json?.all_pages,
          jsonlinesDownloadUrl: links.jsonlines?.all_pages,
          csvDownloadUrl: links.csv?.all_pages
        }
      };
    }
  })
  .build();
