import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exploreGraph = SlateTool.create(spec, {
  name: 'Explore Graph',
  key: 'explore_graph',
  description: `Browse nodes, edges, and episodes in a user's knowledge graph. Retrieve all nodes for a user, get edges connected to a specific node, or get episodes that mention a node. Useful for understanding the structure and contents of a graph.`,
  instructions: [
    'Start with "list_nodes" to discover entities in a user graph, then drill into specific nodes with "node_edges" or "node_episodes".',
    'Use uuidCursor for paginating through large sets of nodes.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_nodes', 'node_edges', 'node_episodes', 'get_edge', 'user_node'])
        .describe(
          'What to explore: list_nodes (all nodes for user), node_edges (edges of a node), node_episodes (episodes mentioning a node), get_edge (single edge), user_node (the user entity node)'
        ),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for list_nodes and user_node)'),
      nodeUuid: z
        .string()
        .optional()
        .describe('Node UUID (required for node_edges and node_episodes)'),
      edgeUuid: z.string().optional().describe('Edge UUID (required for get_edge)'),
      limit: z.number().optional().describe('Max number of nodes to return for list_nodes'),
      uuidCursor: z.string().optional().describe('Pagination cursor for list_nodes')
    })
  )
  .output(
    z.object({
      nodes: z
        .array(
          z.object({
            uuid: z.string().describe('Node UUID'),
            name: z.string().describe('Node name'),
            summary: z.string().optional().nullable().describe('Node summary'),
            labels: z.array(z.string()).optional().nullable().describe('Node labels'),
            attributes: z
              .record(z.string(), z.unknown())
              .optional()
              .nullable()
              .describe('Node attributes'),
            createdAt: z.string().optional().nullable().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of graph nodes'),
      edges: z
        .array(
          z.object({
            uuid: z.string().describe('Edge UUID'),
            fact: z.string().describe('Fact text'),
            name: z.string().optional().nullable().describe('Edge name'),
            sourceNodeUuid: z.string().optional().nullable().describe('Source node UUID'),
            targetNodeUuid: z.string().optional().nullable().describe('Target node UUID'),
            createdAt: z.string().optional().nullable().describe('Creation timestamp'),
            validAt: z.string().optional().nullable().describe('Valid from timestamp'),
            invalidAt: z.string().optional().nullable().describe('Invalid from timestamp'),
            expiredAt: z.string().optional().nullable().describe('Expiration timestamp')
          })
        )
        .optional()
        .describe('List of graph edges'),
      episodes: z
        .array(
          z.object({
            uuid: z.string().optional().nullable().describe('Episode UUID'),
            content: z.string().optional().nullable().describe('Episode content')
          })
        )
        .optional()
        .describe('List of episodes'),
      userNode: z
        .object({
          uuid: z.string().describe('User node UUID'),
          name: z.string().describe('User node name'),
          summary: z.string().optional().nullable().describe('User node summary'),
          labels: z.array(z.string()).optional().nullable().describe('User node labels')
        })
        .optional()
        .nullable()
        .describe('The user entity node')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'list_nodes') {
      if (!ctx.input.userId) throw new Error('userId is required for list_nodes');
      let result = await client.getUserNodes(ctx.input.userId, {
        limit: ctx.input.limit,
        uuidCursor: ctx.input.uuidCursor
      });
      let nodes = (Array.isArray(result) ? result : result.nodes || []).map((n: any) => ({
        uuid: n.uuid,
        name: n.name,
        summary: n.summary,
        labels: n.labels,
        attributes: n.attributes,
        createdAt: n.created_at
      }));
      return {
        output: { nodes },
        message: `Found **${nodes.length}** nodes in user **${ctx.input.userId}**'s graph.`
      };
    }

    if (ctx.input.action === 'node_edges') {
      if (!ctx.input.nodeUuid) throw new Error('nodeUuid is required for node_edges');
      let result = await client.getNodeEdges(ctx.input.nodeUuid);
      let edgeList = Array.isArray(result) ? result : result.edges || [];
      let edges = edgeList.map((e: any) => ({
        uuid: e.uuid,
        fact: e.fact,
        name: e.name,
        sourceNodeUuid: e.source_node_uuid,
        targetNodeUuid: e.target_node_uuid,
        createdAt: e.created_at,
        validAt: e.valid_at,
        invalidAt: e.invalid_at,
        expiredAt: e.expired_at
      }));
      return {
        output: { edges },
        message: `Found **${edges.length}** edges for node **${ctx.input.nodeUuid}**.`
      };
    }

    if (ctx.input.action === 'node_episodes') {
      if (!ctx.input.nodeUuid) throw new Error('nodeUuid is required for node_episodes');
      let result = await client.getNodeEpisodes(ctx.input.nodeUuid);
      let episodeList = Array.isArray(result) ? result : result.episodes || [];
      let episodes = episodeList.map((ep: any) => ({
        uuid: ep.uuid,
        content: ep.content
      }));
      return {
        output: { episodes },
        message: `Found **${episodes.length}** episodes mentioning node **${ctx.input.nodeUuid}**.`
      };
    }

    if (ctx.input.action === 'get_edge') {
      if (!ctx.input.edgeUuid) throw new Error('edgeUuid is required for get_edge');
      let edge = await client.getEdge(ctx.input.edgeUuid);
      return {
        output: {
          edges: [
            {
              uuid: edge.uuid,
              fact: edge.fact,
              name: edge.name,
              sourceNodeUuid: edge.source_node_uuid,
              targetNodeUuid: edge.target_node_uuid,
              createdAt: edge.created_at,
              validAt: edge.valid_at,
              invalidAt: edge.invalid_at,
              expiredAt: edge.expired_at
            }
          ]
        },
        message: `Retrieved edge **${edge.uuid}**: ${edge.fact}.`
      };
    }

    // user_node
    if (!ctx.input.userId) throw new Error('userId is required for user_node');
    let userNode = await client.getUserNode(ctx.input.userId);
    return {
      output: {
        userNode: userNode
          ? {
              uuid: userNode.uuid,
              name: userNode.name,
              summary: userNode.summary,
              labels: userNode.labels
            }
          : null
      },
      message: `Retrieved user node for **${ctx.input.userId}**.`
    };
  })
  .build();
