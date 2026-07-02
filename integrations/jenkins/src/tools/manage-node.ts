import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let manageNode = SlateTool.create(spec, {
  name: 'Manage Node',
  key: 'manage_node',
  description: `List, get, create, delete, or toggle online/offline status of Jenkins nodes (agents).
Nodes are the machines on which build agents run. Jenkins monitors each node for disk space, free temp space, free swap, clock time/sync, and response time.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'set_offline', 'set_online'])
        .describe('Action to perform'),
      nodeName: z
        .string()
        .optional()
        .describe(
          'Name of the node. Use "master" for the built-in node. Required for all except "list".'
        ),
      description: z.string().optional().describe('Description for a new node (for "create")'),
      remoteFs: z
        .string()
        .optional()
        .describe('Remote root directory for a new node (for "create")'),
      numExecutors: z
        .number()
        .optional()
        .describe('Number of executors for a new node (for "create")'),
      labels: z
        .string()
        .optional()
        .describe('Space-separated labels for a new node (for "create")'),
      offlineMessage: z
        .string()
        .optional()
        .describe('Reason message when taking a node offline (for "set_offline")')
    })
  )
  .output(
    z.object({
      nodes: z
        .array(
          z.object({
            nodeName: z.string().describe('Name of the node'),
            offline: z.boolean().optional().describe('Whether the node is offline'),
            temporarilyOffline: z
              .boolean()
              .optional()
              .describe('Whether the node is temporarily offline'),
            idle: z.boolean().optional().describe('Whether the node is idle'),
            numExecutors: z.number().optional().describe('Number of executors')
          })
        )
        .optional()
        .describe('List of nodes (for "list" action)'),
      node: z
        .object({
          nodeName: z.string().describe('Name of the node'),
          offline: z.boolean().optional().describe('Whether the node is offline'),
          temporarilyOffline: z
            .boolean()
            .optional()
            .describe('Whether the node is temporarily offline'),
          idle: z.boolean().optional().describe('Whether the node is idle'),
          numExecutors: z.number().optional().describe('Number of executors'),
          offlineCauseReason: z
            .string()
            .optional()
            .nullable()
            .describe('Reason for being offline'),
          monitorData: z
            .any()
            .optional()
            .describe('Monitor data including disk space, response time, etc.')
        })
        .optional()
        .describe('Node details (for "get" action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let { action, nodeName } = ctx.input;

    if (action === 'list') {
      let data = await client.listNodes();
      let nodes = (data.computer || []).map((n: any) => ({
        nodeName: n.displayName,
        offline: n.offline,
        temporarilyOffline: n.temporarilyOffline,
        idle: n.idle,
        numExecutors: n.numExecutors
      }));
      return {
        output: { nodes, success: true },
        message: `Found **${nodes.length}** node(s). ${nodes.filter((n: any) => n.offline).length} offline.`
      };
    }

    if (!nodeName) throw new Error('nodeName is required for this action');

    if (action === 'get') {
      let node = await client.getNode(nodeName);
      return {
        output: {
          node: {
            nodeName: node.displayName,
            offline: node.offline,
            temporarilyOffline: node.temporarilyOffline,
            idle: node.idle,
            numExecutors: node.numExecutors,
            offlineCauseReason: node.offlineCauseReason,
            monitorData: node.monitorData
          },
          success: true
        },
        message: `Node **${node.displayName}** — ${node.offline ? 'offline' : 'online'}, ${node.numExecutors} executor(s).`
      };
    }

    if (action === 'create') {
      await client.createNode(nodeName, {
        description: ctx.input.description,
        remoteFs: ctx.input.remoteFs,
        numExecutors: ctx.input.numExecutors,
        labels: ctx.input.labels
      });
      return {
        output: { success: true },
        message: `Node **${nodeName}** created.`
      };
    }

    if (action === 'delete') {
      await client.deleteNode(nodeName);
      return {
        output: { success: true },
        message: `Node **${nodeName}** deleted.`
      };
    }

    if (action === 'set_offline') {
      await client.toggleNodeOffline(nodeName, true, ctx.input.offlineMessage);
      return {
        output: { success: true },
        message: `Node **${nodeName}** taken offline.${ctx.input.offlineMessage ? ` Reason: ${ctx.input.offlineMessage}` : ''}`
      };
    }

    if (action === 'set_online') {
      await client.toggleNodeOffline(nodeName, false);
      return {
        output: { success: true },
        message: `Node **${nodeName}** brought online.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
