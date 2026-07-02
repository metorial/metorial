import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let createQuery = SlateTool.create(spec, {
  name: 'Create Query',
  key: 'create_query',
  description: `Create a new SEO content analysis query for a target keyword within a project. Returns the query ID and shareable URLs for collaboration. After creation, recommendations typically take ~60 seconds to become available.`,
  instructions: [
    'Use the List Projects tool first to find available project IDs.',
    'After creating a query, wait ~60 seconds before fetching recommendations with Get Recommendations.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to add the query to'),
      keyword: z.string().describe('Target keyword to analyze'),
      engine: z.string().describe('Search engine to use (e.g. google.com, google.co.uk)'),
      language: z.string().describe('Content language (e.g. English, German, French)'),
      additionalKeywords: z
        .array(z.string())
        .optional()
        .describe('Supporting keywords for the analysis'),
      competitorsMode: z
        .enum(['top10', 'top30', 'top-intent'])
        .optional()
        .describe('Competitors analysis mode')
    })
  )
  .output(
    z.object({
      queryId: z.string().describe('Unique query identifier'),
      queryUrl: z.string().describe('Direct URL to the query in NeuronWriter'),
      shareUrl: z.string().describe('Shareable URL with edit and save access'),
      readonlyUrl: z.string().describe('Read-only preview URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);

    let params: Record<string, any> = {
      project: ctx.input.projectId,
      keyword: ctx.input.keyword,
      engine: ctx.input.engine,
      language: ctx.input.language
    };

    if (ctx.input.additionalKeywords) {
      params.additional_keywords = ctx.input.additionalKeywords;
    }
    if (ctx.input.competitorsMode) {
      params.competitors_mode = ctx.input.competitorsMode;
    }

    let result = await client.createQuery(params as any);

    return {
      output: {
        queryId: result.query,
        queryUrl: result.query_url,
        shareUrl: result.share_url,
        readonlyUrl: result.readonly_url
      },
      message: `Created query for keyword **"${ctx.input.keyword}"**. Recommendations will be ready in ~60 seconds.\n\n- [Open in NeuronWriter](${result.query_url})\n- [Share URL](${result.share_url})`
    };
  })
  .build();
