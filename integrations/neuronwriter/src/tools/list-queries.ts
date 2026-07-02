import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
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

    let params: Record<string, any> = {
      project: ctx.input.projectId
    };

    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.source) params.source = ctx.input.source;
    if (ctx.input.createdAfter) params.created = ctx.input.createdAfter;
    if (ctx.input.keyword) params.keyword = ctx.input.keyword;
    if (ctx.input.language) params.language = ctx.input.language;
    if (ctx.input.engine) params.engine = ctx.input.engine;
    if (ctx.input.tags) params.tags = ctx.input.tags;

    let queries = await client.listQueries(params as any);

    let mapped = queries.map(q => ({
      queryId: q.query,
      keyword: q.keyword,
      language: q.language,
      engine: q.engine,
      status: q.status,
      source: q.source,
      tags: q.tags || [],
      createdAt: q.created,
      updatedAt: q.updated,
      queryUrl: q.query_url,
      shareUrl: q.share_url,
      readonlyUrl: q.readonly_url
    }));

    return {
      output: { queries: mapped },
      message: `Found **${mapped.length}** query/queries in the project.`
    };
  })
  .build();
