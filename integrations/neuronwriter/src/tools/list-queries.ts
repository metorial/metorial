import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type ListQueriesParams, NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let listQueries = SlateTool.create(spec, {
  name: 'List Queries',
  key: 'list_queries',
  description: `List keyword queries within a project, with optional filtering by status, source, keyword, language, engine, tags, and creation date. Returns query metadata and shareable URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to list queries from'),
      status: z
        .enum(['waiting', 'in progress', 'ready'])
        .optional()
        .describe('Filter by query analysis status'),
      source: z
        .enum(['neuron', 'neuron-api'])
        .optional()
        .describe('Filter by creation source'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter queries created after this ISO 8601 date'),
      updatedAt: z
        .string()
        .optional()
        .describe('Filter by query update timestamp using the provider updated parameter'),
      keyword: z.string().optional().describe('Filter by keyword'),
      language: z.string().optional().describe('Filter by language'),
      engine: z.string().optional().describe('Filter by search engine'),
      tags: z.array(z.string()).optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      queries: z.array(
        z.object({
          queryId: z.string().describe('Unique query identifier'),
          keyword: z.string().describe('Target keyword'),
          language: z.string().describe('Content language'),
          engine: z.string().describe('Search engine'),
          status: z.string().describe('Analysis status (waiting, in progress, ready)'),
          source: z.string().describe('Creation source (neuron or neuron-api)'),
          tags: z.array(z.string()).describe('Associated tags'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          queryUrl: z.string().optional().describe('Direct URL to the query'),
          shareUrl: z.string().optional().describe('Shareable edit URL'),
          readonlyUrl: z.string().optional().describe('Read-only preview URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);

    let params: ListQueriesParams = {
      project: ctx.input.projectId
    };

    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.source) params.source = ctx.input.source;
    if (ctx.input.createdAfter) params.created = ctx.input.createdAfter;
    if (ctx.input.updatedAt !== undefined) params.updated = ctx.input.updatedAt;
    if (ctx.input.keyword) params.keyword = ctx.input.keyword;
    if (ctx.input.language) params.language = ctx.input.language;
    if (ctx.input.engine) params.engine = ctx.input.engine;
    if (ctx.input.tags) params.tags = ctx.input.tags;

    let queries = await client.listQueries(params);

    let mapped: {
      queryId: string;
      keyword: string;
      language: string;
      engine: string;
      status: string;
      source: string;
      tags: string[];
      createdAt: string;
      updatedAt: string;
      queryUrl?: string;
      shareUrl?: string;
      readonlyUrl?: string;
    }[] = [];
    for (let query of queries) {
      // The official list examples omit status and sometimes other metadata.
      let details =
        query.status === undefined ||
        query.keyword === undefined ||
        query.language === undefined ||
        query.engine === undefined
          ? await client.getQuery(query.query)
          : undefined;
      let keyword = query.keyword ?? details?.keyword;
      let language = query.language ?? details?.language;
      let engine = query.engine ?? details?.engine;
      let status = query.status ?? details?.status;

      if (
        keyword === undefined ||
        language === undefined ||
        engine === undefined ||
        status === undefined
      ) {
        throw createApiServiceError(
          `NeuronWriter omitted required metadata for query ${query.query}.`,
          { reason: 'neuronwriter_invalid_response' }
        );
      }

      mapped.push({
        queryId: query.query,
        keyword,
        language,
        engine,
        status,
        source: query.source,
        tags: query.tags ?? [],
        createdAt: query.created,
        updatedAt: query.updated,
        queryUrl: query.query_url,
        shareUrl: query.share_url,
        readonlyUrl: query.readonly_url
      });
    }

    return {
      output: { queries: mapped },
      message: `Found **${mapped.length}** query/queries in the project.`
    };
  })
  .build();
