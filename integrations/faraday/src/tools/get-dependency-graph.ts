import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let graphEdgeSchema = z.object({
  downstreamId: z.string().describe('UUID of the dependent resource'),
  downstreamType: z.string().describe('Resource type of the dependent resource'),
  downstreamName: z
    .string()
    .optional()
    .describe('Human-readable name of the dependent resource'),
  downstreamStatus: z.string().optional().describe('Status of the dependent resource'),
  upstreamId: z.string().describe('UUID of the dependency source resource'),
  upstreamType: z.string().describe('Resource type of the dependency source'),
  upstreamName: z.string().optional().describe('Human-readable name of the dependency source'),
  upstreamStatus: z.string().optional().describe('Status of the dependency source')
});

export let getDependencyGraph = SlateTool.create(spec, {
  name: 'Get Dependency Graph',
  key: 'get_dependency_graph',
  description: `Retrieve the complete dependency graph of all resources in your account. Shows how datasets, streams, cohorts, outcomes, scopes, and targets relate to each other. Useful for understanding resource relationships and identifying dependencies before making changes.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      edges: z.array(graphEdgeSchema).describe('List of dependency edges between resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let graph = await client.getGraph();

    let edges = graph.map((edge: any) => ({
      downstreamId: edge.downstream_id,
      downstreamType: edge.downstream_type,
      downstreamName: edge.downstream_literate,
      downstreamStatus: edge.downstream_status,
      upstreamId: edge.upstream_id,
      upstreamType: edge.upstream_type,
      upstreamName: edge.upstream_literate,
      upstreamStatus: edge.upstream_status
    }));

    return {
      output: { edges },
      message: `Retrieved dependency graph with **${edges.length}** edge(s) showing resource relationships.`
    };
  })
  .build();
