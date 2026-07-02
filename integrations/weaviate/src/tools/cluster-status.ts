import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let clusterStatus = SlateTool.create(spec, {
  name: 'Cluster Status',
  key: 'cluster_status',
  description: `Get comprehensive information about the Weaviate instance including version, module list, cluster health, and node statuses with shard and object counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeNodeDetails: z
        .boolean()
        .optional()
        .describe(
          'Whether to include detailed node information with shard statistics. Defaults to true.'
        )
    })
  )
  .output(
    z.object({
      version: z.string().optional().describe('Weaviate server version'),
      hostname: z.string().optional().describe('Server hostname'),
      modules: z.array(z.any()).optional().describe('Enabled modules'),
      isLive: z.boolean().describe('Whether the instance is live'),
      isReady: z.boolean().describe('Whether the instance is ready to accept requests'),
      nodes: z
        .array(
          z
            .object({
              name: z.string().optional().describe('Node name'),
              status: z.string().optional().describe('Node status'),
              version: z.string().optional().describe('Node version'),
              gitHash: z.string().optional().describe('Git commit hash'),
              shards: z.array(z.any()).optional().describe('Shard information'),
              stats: z.any().optional().describe('Node statistics')
            })
            .passthrough()
        )
        .optional()
        .describe('Node details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let includeDetails = ctx.input.includeNodeDetails !== false;

    let [meta, liveCheck, readyCheck] = await Promise.all([
      client.getMeta().catch(() => null),
      client.getLiveness().catch(() => false),
      client.getReadiness().catch(() => false)
    ]);

    let nodesData: any = null;
    if (includeDetails) {
      nodesData = await client.getNodes({ output: 'verbose' }).catch(() => null);
    }

    return {
      output: {
        version: meta?.version,
        hostname: meta?.hostname,
        modules: meta?.modules,
        isLive: liveCheck,
        isReady: readyCheck,
        nodes: nodesData?.nodes
      },
      message: `Weaviate **${meta?.version || 'unknown'}** — ${liveCheck ? '✓ Live' : '✗ Not live'}, ${readyCheck ? '✓ Ready' : '✗ Not ready'}. ${nodesData?.nodes?.length || 0} node(s).`
    };
  })
  .build();
