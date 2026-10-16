import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCollectionResults = SlateTool.create(spec, {
  name: 'Get Collection Results',
  key: 'get_collection_results',
  description: `List result sets for a collection, download a specific result set, or resend a webhook notification. Result sets contain the output of completed collection runs and are retained for 14 days. Results can be retrieved in JSON, JSON Lines, or CSV format.`,
  instructions: [
    'Use action "list" to see all result sets for a collection.',
    'Use action "get" to download a specific result set by ID.',
    'Use action "resend_webhook" to re-trigger the webhook POST for a result set (useful for debugging).'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'resend_webhook']).describe('Action to perform.'),
      collectionId: z.string().describe('Collection ID to get results for.'),
      resultSetId: z
        .string()
        .optional()
        .describe('Result set ID. Required for get and resend_webhook actions.'),
      format: z
        .enum(['json', 'jsonlines', 'csv'])
        .optional()
        .describe('Download format for get action. Defaults to json.'),
      csvFields: z
        .string()
        .optional()
        .describe('Comma-separated field list for CSV format (dot notation).')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.any())
        .optional()
        .describe('Array of result sets with metadata (list action).'),
      resultsCount: z.number().optional().describe('Total number of result sets.'),
      resultSet: z
        .any()
        .optional()
        .describe('Result set data with download links (get action).'),
      downloadLinks: z.any().optional().describe('Download URLs for the result set.'),
      requestInfo: z.any().optional().describe('Request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action !== 'list' && !ctx.input.resultSetId?.trim()) {
      throw createApiServiceError(
        'Provide resultSetId. Use get_collection_results with action list to find result sets.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let data = await client.listResultSets(ctx.input.collectionId);
      return {
        output: {
          results: data.results ?? [],
          resultsCount: data.results_count,
          requestInfo: data.request_info
        },
        message: `Found **${data.results_count ?? data.results?.length ?? 0}** result sets for collection ${ctx.input.collectionId}.`
      };
    }

    if (ctx.input.action === 'get') {
      let format = ctx.input.format ?? 'json';
      let data = await client.getResultSet(
        ctx.input.collectionId,
        ctx.input.resultSetId!,
        format,
        ctx.input.csvFields
      );
      let downloadLinks = data.download_links ?? data.result?.download_links;
      let urls =
        typeof downloadLinks?.all_pages === 'string'
          ? [downloadLinks.all_pages]
          : Array.isArray(downloadLinks?.pages)
            ? downloadLinks.pages
            : [];
      for (let url of urls) {
        if (
          typeof url !== 'string' ||
          !URL.canParse(url) ||
          !['https:', 'http:'].includes(new URL(url).protocol)
        ) {
          throw createApiServiceError(
            'RedCircle returned an invalid result download URL. Request the result set again.'
          );
        }
        await ctx.addAttachment({
          type: 'url',
          url,
          mimeType: new URL(url).pathname.endsWith('.zip')
            ? 'application/zip'
            : format === 'csv'
              ? 'text/csv'
              : format === 'jsonlines'
                ? 'application/x-ndjson'
                : 'application/json'
        });
      }
      // Preserve legacy raw file responses as well as their public output value.
      if (typeof data === 'string') {
        await ctx.addAttachment({
          type: 'content',
          content: Buffer.from(data),
          mimeType:
            format === 'csv'
              ? 'text/csv'
              : format === 'jsonlines'
                ? 'application/x-ndjson'
                : 'application/json'
        });
      }
      return {
        output: {
          resultSet: data,
          downloadLinks,
          requestInfo: data.request_info
        },
        message: `Retrieved result set **${ctx.input.resultSetId}** in ${format} format.`
      };
    }

    // resend_webhook
    let data = await client.resendWebhook(ctx.input.collectionId, ctx.input.resultSetId!);
    return {
      output: {
        requestInfo: data.request_info
      },
      message: `Resent webhook for result set **${ctx.input.resultSetId}** of collection ${ctx.input.collectionId}.`
    };
  })
  .build();
