import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nodeSchema = z.object({
  uuid: z.string().describe('Node UUID'),
  name: z.string().describe('Node name'),
  summary: z.string().optional().nullable().describe('Node summary'),
  labels: z.array(z.string()).optional().nullable().describe('Node labels/types'),
  score: z.number().optional().nullable().describe('Search relevance score')
});

let edgeSchema = z.object({
  uuid: z.string().describe('Edge UUID'),
  fact: z.string().describe('The fact this edge represents'),
  name: z.string().optional().nullable().describe('Edge name'),
  sourceNodeUuid: z.string().optional().nullable().describe('Source node UUID'),
  targetNodeUuid: z.string().optional().nullable().describe('Target node UUID')
});

let episodeSchema = z.object({
  content: z.string().optional().nullable().describe('Episode content'),
  uuid: z.string().optional().nullable().describe('Episode UUID')
});

export let searchGraph = SlateTool.create(spec, {
  name: 'Search Graph',
  key: 'search_graph',
  description: `Search a user's or group's knowledge graph using hybrid semantic and full-text search. Can search across nodes (entities), edges (facts/relationships), or episodes (messages/data chunks). Supports multiple reranking strategies and filtering options.`,
  instructions: [
    'Provide either userId or graphId to specify which graph to search.',
    'Use scope to focus on nodes, edges, or episodes depending on what you need.'
  ],
  constraints: ['Query max length is 400 characters.', 'Max limit is 50 results.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().max(400).describe('Search query text (max 400 characters)'),
      userId: z.string().optional().describe('User ID to search in their graph'),
      graphId: z.string().optional().describe('Standalone graph ID to search'),
      limit: z.number().optional().describe('Maximum number of results (default 10, max 50)'),
      scope: z
        .enum(['edges', 'nodes', 'episodes'])
        .optional()
        .describe('What to search: edges (facts), nodes (entities), or episodes (messages)'),
      reranker: z
        .enum(['rrf', 'mmr', 'node_distance', 'episode_mentions', 'cross_encoder'])
        .optional()
        .describe('Reranking strategy to use'),
      mmrLambda: z
        .number()
        .optional()
        .describe(
          'Lambda parameter for MMR reranker (0-1, higher = more relevance vs diversity)'
        ),
      centerNodeUuid: z
        .string()
        .optional()
        .describe('Center node UUID for distance-based reranking'),
      bfsOriginNodeUuids: z
        .array(z.string())
        .optional()
        .describe('Starting node UUIDs for breadth-first search biasing'),
      edgeTypeFilter: z
        .array(z.string())
        .optional()
        .describe('Filter results to specific edge types'),
      nodeLabelFilter: z
        .array(z.string())
        .optional()
        .describe('Filter results to specific node labels')
    })
  )
  .output(
    z.object({
      nodes: z.array(nodeSchema).optional().describe('Matching graph nodes (entities)'),
      edges: z
        .array(edgeSchema)
        .optional()
        .describe('Matching graph edges (facts/relationships)'),
      episodes: z
        .array(episodeSchema)
        .optional()
        .describe('Matching episodes (messages/data chunks)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let searchFilters: { edgeTypes?: string[]; nodeLabels?: string[] } | undefined;
    if (ctx.input.edgeTypeFilter || ctx.input.nodeLabelFilter) {
      searchFilters = {
        edgeTypes: ctx.input.edgeTypeFilter,
        nodeLabels: ctx.input.nodeLabelFilter
      };
    }

    let result = await client.graphSearch({
      query: ctx.input.query,
      userId: ctx.input.userId,
      graphId: ctx.input.graphId,
      limit: ctx.input.limit,
      scope: ctx.input.scope,
      reranker: ctx.input.reranker,
      mmrLambda: ctx.input.mmrLambda,
      centerNodeUuid: ctx.input.centerNodeUuid,
      bfsOriginNodeUuids: ctx.input.bfsOriginNodeUuids,
      searchFilters
    });

    let nodes = (result.nodes || []).map((n: any) => ({
      uuid: n.uuid,
      name: n.name,
      summary: n.summary,
      labels: n.labels,
      score: n.score
    }));

    let edges = (result.edges || []).map((e: any) => ({
      uuid: e.uuid,
      fact: e.fact,
      name: e.name,
      sourceNodeUuid: e.source_node_uuid,
      targetNodeUuid: e.target_node_uuid
    }));

    let episodes = (result.episodes || []).map((ep: any) => ({
      content: ep.content,
      uuid: ep.uuid
    }));

    let scope = ctx.input.scope || 'edges';
    let count =
      scope === 'nodes' ? nodes.length : scope === 'episodes' ? episodes.length : edges.length;

    return {
      output: { nodes, edges, episodes },
      message: `Found **${count}** ${scope} matching "${ctx.input.query}".`
    };
  })
  .build();
