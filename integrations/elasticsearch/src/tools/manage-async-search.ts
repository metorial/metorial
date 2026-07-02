import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

let sourceFilterSchema = z.union([
  z.boolean(),
  z.array(z.string()),
  z.object({
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional()
  })
]);

let summarizeHits = (response: any) => {
  let hits = (response?.hits?.hits || []).map((hit: any) => ({
    indexName: hit._index,
    documentId: hit._id,
    score: hit._score,
    source: hit._source
  }));

  let total = response?.hits?.total;
  let totalHits = typeof total === 'number' ? total : total?.value;
  let totalRelation = typeof total === 'number' ? 'eq' : total?.relation;

  return {
    totalHits,
    totalRelation,
    hits,
    aggregations: response?.aggregations
  };
};

export let manageAsyncSearchTool = SlateTool.create(spec, {
  name: 'Manage Async Search',
  key: 'manage_async_search',
  description: `Submit, retrieve, or delete an Elasticsearch asynchronous search. Use this for long-running Query DSL searches when partial results are useful or when results should be retrieved later by ID.`,
  instructions: [
    'Use action "submit" with Query DSL fields to start an async search.',
    'Use action "get" with searchId to retrieve a submitted async search.',
    'Use action "delete" with searchId to cancel a running async search or delete stored results.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['submit', 'get', 'delete'])
        .describe('The async search action to perform'),
      searchId: z.string().optional().describe('Async search ID for get and delete actions'),
      indexName: z
        .string()
        .optional()
        .describe('Index to search for submit action. Omit to search all indices'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('Elasticsearch Query DSL query object for submit action'),
      aggregations: z
        .record(z.string(), z.any())
        .optional()
        .describe('Aggregation definitions for submit action'),
      sort: z.array(z.any()).optional().describe('Sort criteria for submit action'),
      from: z.number().optional().describe('Starting offset for submit action'),
      size: z.number().optional().describe('Number of results to return for submit action'),
      sourceFilter: sourceFilterSchema
        .optional()
        .describe('Control which source fields are returned for submit action'),
      highlight: z
        .record(z.string(), z.any())
        .optional()
        .describe('Highlight configuration for submit action'),
      keepAlive: z
        .string()
        .optional()
        .describe('How long to retain async search results, such as "5m" or "1h"'),
      waitForCompletionTimeout: z
        .string()
        .optional()
        .describe('How long to wait for initial results before returning, such as "1s"'),
      keepOnCompletion: z
        .boolean()
        .optional()
        .describe('Store completed results so they can be fetched later by searchId')
    })
  )
  .output(
    z.object({
      searchId: z.string().optional().describe('Async search ID'),
      isPartial: z.boolean().optional().describe('Whether returned results are partial'),
      isRunning: z.boolean().optional().describe('Whether the async search is still running'),
      acknowledged: z
        .boolean()
        .optional()
        .describe('Whether a delete request was acknowledged'),
      startTimeMillis: z.number().optional().describe('Search start time in milliseconds'),
      expirationTimeMillis: z
        .number()
        .optional()
        .describe('Stored result expiration time in milliseconds'),
      completionTimeMillis: z
        .number()
        .optional()
        .describe('Search completion time in milliseconds'),
      totalHits: z.number().optional().describe('Total number of matching documents'),
      totalRelation: z.string().optional().describe('Whether total is exact or a lower bound'),
      hits: z
        .array(
          z.object({
            indexName: z.string().describe('Index containing the document'),
            documentId: z.string().describe('Document ID'),
            score: z.number().nullable().describe('Relevance score'),
            source: z.record(z.string(), z.any()).optional().describe('Document source')
          })
        )
        .optional()
        .describe('Returned search hits'),
      aggregations: z.record(z.string(), z.any()).optional().describe('Aggregation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'submit': {
        let body: Record<string, any> = {};
        if (ctx.input.query) body.query = ctx.input.query;
        if (ctx.input.aggregations) body.aggs = ctx.input.aggregations;
        if (ctx.input.sort) body.sort = ctx.input.sort;
        if (ctx.input.from !== undefined) body.from = ctx.input.from;
        if (ctx.input.size !== undefined) body.size = ctx.input.size;
        if (ctx.input.sourceFilter !== undefined) body._source = ctx.input.sourceFilter;
        if (ctx.input.highlight) body.highlight = ctx.input.highlight;

        let params: Record<string, any> = {};
        if (ctx.input.keepAlive) params.keep_alive = ctx.input.keepAlive;
        if (ctx.input.waitForCompletionTimeout) {
          params.wait_for_completion_timeout = ctx.input.waitForCompletionTimeout;
        }
        if (ctx.input.keepOnCompletion !== undefined) {
          params.keep_on_completion = ctx.input.keepOnCompletion;
        }

        let result = await client.asyncSearch(ctx.input.indexName, body, params);
        let summary = summarizeHits(result.response);

        return {
          output: {
            searchId: result.id,
            isPartial: result.is_partial,
            isRunning: result.is_running,
            startTimeMillis: result.start_time_in_millis,
            expirationTimeMillis: result.expiration_time_in_millis,
            completionTimeMillis: result.completion_time_in_millis,
            ...summary
          },
          message: result.id
            ? `Async search **${result.id}** submitted. Running: **${Boolean(result.is_running)}**.`
            : `Async search completed without a stored ID.`
        };
      }
      case 'get': {
        if (!ctx.input.searchId) {
          throw elasticsearchServiceError('searchId is required for get action');
        }

        let result = await client.getAsyncSearch(ctx.input.searchId);
        let summary = summarizeHits(result.response);

        return {
          output: {
            searchId: result.id ?? ctx.input.searchId,
            isPartial: result.is_partial,
            isRunning: result.is_running,
            startTimeMillis: result.start_time_in_millis,
            expirationTimeMillis: result.expiration_time_in_millis,
            completionTimeMillis: result.completion_time_in_millis,
            ...summary
          },
          message: `Retrieved async search **${ctx.input.searchId}**. Running: **${Boolean(result.is_running)}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.searchId) {
          throw elasticsearchServiceError('searchId is required for delete action');
        }

        let result = await client.deleteAsyncSearch(ctx.input.searchId);
        return {
          output: {
            searchId: ctx.input.searchId,
            acknowledged: result.acknowledged ?? true
          },
          message: `Async search **${ctx.input.searchId}** deleted.`
        };
      }
    }
  })
  .build();
