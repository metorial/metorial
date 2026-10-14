import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { consortiumId, environmentId } from '../lib/schemas';
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
      consortiumId,
      environmentId,
      nodeId: z.string().describe('Node ID'),
      includeLogs: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include recent node logs'),
      logType: z
        .enum(['geth', 'constellation', 'pantheon', 'ethsigner', 'orion', 'ethconnect', 'baf'])
        .optional()
        .describe('Log component. Defaults to geth for Geth/Quorum and pantheon for Besu.'),
      maxLogLines: z
        .number()
        .int()
        .positive()
        .optional()
        .default(20)
        .describe('Maximum log lines when includeLogs is true'),
      logFromPosition: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Starting log position when includeLogs is true')
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

    let status = await client.getNodeStatus(
      ctx.input.consortiumId,
      ctx.input.environmentId,
      ctx.input.nodeId
    );

    let logs: unknown;
    if (ctx.input.includeLogs) {
      let defaultLogTypes: Record<string, string> = {
        geth: 'geth',
        quorum: 'geth',
        pantheon: 'pantheon',
        besu: 'pantheon'
      };
      let logType = ctx.input.logType ?? defaultLogTypes[node.provider];
      if (!logType) {
        throw createApiServiceError('Provide a supported logType for this node protocol.', {
          reason: 'invalid_input'
        });
      }
      logs = await client.getNodeLogs(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId,
        logType,
        { maxlines: ctx.input.maxLogLines, frompos: ctx.input.logFromPosition }
      );
    }

    return {
      output: {
        nodeId: node._id ?? node.id,
        name: node.name ?? undefined,
        state: node.state ?? undefined,
        role: node.role ?? undefined,
        size: node.size ?? undefined,
        urls: status.urls ?? node.urls,
        status,
        logs
      },
      message: `Node **${node.name}** — state: ${node.state || 'unknown'}, role: ${node.role || 'default'}.${status ? ' Status data retrieved.' : ''}${logs ? ' Logs included.' : ''}`
    };
  })
  .build();
