import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let graphExploreTool = SlateTool.create(spec, {
  name: 'Graph Explore',
  key: 'graph_explore',
  description: `Discover relationships between terms in an Elasticsearch index. The graph explore API extracts and summarizes connections in your data, helping identify significant co-occurrences and related terms.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      indexName: z.string().describe('Index to explore'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('Query to filter documents for exploration'),
      vertices: z
        .array(
          z.object({
            field: z.string().describe('Field name to find vertices in'),
            size: z.number().optional().describe('Maximum number of vertex terms to include'),
            minDocCount: z
              .number()
              .optional()
              .describe('Minimum number of documents a term must appear in'),
            include: z
              .array(z.string())
              .optional()
              .describe('Only include these specific terms'),
            exclude: z.array(z.string()).optional().describe('Exclude these specific terms')
          })
        )
        .describe('Fields and terms to explore'),
      connections: z
        .object({
          vertices: z
            .array(
              z.object({
                field: z.string().describe('Field name for connected vertices'),
                size: z.number().optional().describe('Maximum number of connected terms'),
                minDocCount: z
                  .number()
                  .optional()
                  .describe('Minimum document count for connected terms')
              })
            )
            .optional()
            .describe('Connected vertex definitions')
        })
        .optional()
        .describe('Connection definitions for second-hop exploration'),
      controls: z
        .object({
          useSignificance: z
            .boolean()
            .optional()
            .describe('Use significance scoring (default: true)'),
          sampleSize: z.number().optional().describe('Number of documents to sample')
        })
        .optional()
        .describe('Graph exploration controls')
    })
  )
  .output(
    z.object({
      vertices: z
        .array(
          z.object({
            field: z.string().describe('Field name'),
            term: z.string().describe('Term value'),
            weight: z.number().describe('Significance weight'),
            depth: z.number().describe('Exploration depth')
          })
        )
        .describe('Discovered vertices (terms)'),
      connections: z
        .array(
          z.object({
            source: z.number().describe('Source vertex index'),
            target: z.number().describe('Target vertex index'),
            weight: z.number().describe('Connection weight'),
            docCount: z.number().describe('Number of documents containing both terms')
          })
        )
        .describe('Connections between vertices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let body: Record<string, any> = {
      vertices: ctx.input.vertices.map(v => {
        let vertex: Record<string, any> = { field: v.field };
        if (v.size) vertex.size = v.size;
        if (v.minDocCount) vertex.min_doc_count = v.minDocCount;
        if (v.include) vertex.include = v.include;
        if (v.exclude) vertex.exclude = v.exclude;
        return vertex;
      })
    };
    if (ctx.input.query) body.query = ctx.input.query;
    if (ctx.input.connections) {
      body.connections = {};
      if (ctx.input.connections.vertices) {
        body.connections.vertices = ctx.input.connections.vertices.map(v => {
          let vertex: Record<string, any> = { field: v.field };
          if (v.size) vertex.size = v.size;
          if (v.minDocCount) vertex.min_doc_count = v.minDocCount;
          return vertex;
        });
      }
    }
    if (ctx.input.controls) {
      body.controls = {};
      if (ctx.input.controls.useSignificance !== undefined)
        body.controls.use_significance = ctx.input.controls.useSignificance;
      if (ctx.input.controls.sampleSize)
        body.controls.sample_size = ctx.input.controls.sampleSize;
    }

    let result = await client.graphExplore(ctx.input.indexName, body);

    let vertices = (result.vertices || []).map((v: any) => ({
      field: v.field,
      term: v.term,
      weight: v.weight,
      depth: v.depth
    }));

    let connections = (result.connections || []).map((c: any) => ({
      source: c.source,
      target: c.target,
      weight: c.weight,
      docCount: c.doc_count
    }));

    return {
      output: { vertices, connections },
      message: `Graph exploration on **${ctx.input.indexName}** found **${vertices.length}** vertices and **${connections.length}** connections.`
    };
  })
  .build();
