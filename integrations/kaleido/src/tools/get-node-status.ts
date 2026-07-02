import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let getNodeStatus = SlateTool.create(spec, {
  name: 'Get Node Status',
  key: 'get_node_status',
  description: `Retrieve detailed status and health information for a blockchain node, including connection details, sync status, and recent logs.
Use this to monitor node health, diagnose issues, or verify a node is running correctly.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      consortiumId: z.string().describe('Consortium ID'),
      environmentId: z.string().describe('Environment ID'),
      nodeId: z.string().describe('Node ID'),
      includeLogs: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include recent node logs')
    })
  )
  .output(
    z.object({
      nodeId: z.string().describe('Node ID'),
      name: z.string().optional().describe('Node name'),
      state: z.string().optional().describe('Node state'),
      role: z.string().optional().describe('Node role'),
      size: z.string().optional().describe('Node size'),
      urls: z.any().optional().describe('Node connection URLs'),
      status: z
        .any()
        .optional()
        .describe('Node status details (sync state, block height, peer count, etc.)'),
      logs: z.any().optional().describe('Recent node logs (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let node = await client.getNode(
      ctx.input.consortiumId,
      ctx.input.environmentId,
      ctx.input.nodeId
    );

    let status: any;
    try {
      status = await client.getNodeStatus(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId
      );
    } catch {
      // Status endpoint may not be available for all node states
    }

    let logs: any;
    if (ctx.input.includeLogs) {
      try {
        logs = await client.getNodeLogs(
          ctx.input.consortiumId,
          ctx.input.environmentId,
          ctx.input.nodeId
        );
      } catch {
        // Logs may not be available
      }
    }

    return {
      output: {
        nodeId: node._id,
        name: node.name,
        state: node.state,
        role: node.role,
        size: node.size,
        urls: node.urls,
        status,
        logs
      },
      message: `Node **${node.name}** — state: ${node.state || 'unknown'}, role: ${node.role || 'default'}.${status ? ' Status data retrieved.' : ''}${logs ? ' Logs included.' : ''}`
    };
  })
  .build();
