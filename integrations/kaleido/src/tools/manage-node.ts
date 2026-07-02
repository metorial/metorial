import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageNode = SlateTool.create(spec, {
  name: 'Manage Node',
  key: 'manage_node',
  description: `Create, list, retrieve, update, or delete blockchain nodes within an environment. Also supports start, stop, and suspend actions on existing nodes.
Nodes run the blockchain protocol and can be configured with different sizes and roles (signer/non-signer).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete', 'start', 'stop', 'suspend'])
        .describe('Action to perform on the node'),
      consortiumId: z.string().describe('Consortium ID'),
      environmentId: z.string().describe('Environment ID'),
      nodeId: z
        .string()
        .optional()
        .describe('Node ID (required for get, update, delete, start, stop, suspend)'),
      name: z.string().optional().describe('Node name (required for create)'),
      membershipId: z
        .string()
        .optional()
        .describe('Membership ID that owns the node (required for create)'),
      role: z
        .enum(['signer', 'non-signer'])
        .optional()
        .describe('Node role in the consensus algorithm'),
      size: z
        .enum(['small', 'medium', 'large'])
        .optional()
        .describe('Node size affecting resource allocation')
    })
  )
  .output(
    z.object({
      nodes: z
        .array(
          z.object({
            nodeId: z.string().describe('Node ID'),
            name: z.string().describe('Node name'),
            membershipId: z.string().optional().describe('Owning membership ID'),
            role: z.string().optional().describe('Node role'),
            state: z.string().optional().describe('Node state'),
            size: z.string().optional().describe('Node size'),
            provider: z.string().optional().describe('Blockchain protocol'),
            urls: z.any().optional().describe('Node connection URLs')
          })
        )
        .optional()
        .describe('List of nodes (for list action)'),
      nodeId: z.string().optional().describe('Node ID'),
      name: z.string().optional().describe('Node name'),
      membershipId: z.string().optional().describe('Membership ID'),
      role: z.string().optional().describe('Node role'),
      state: z.string().optional().describe('Node state'),
      size: z.string().optional().describe('Node size'),
      urls: z.any().optional().describe('Node connection URLs'),
      deleted: z.boolean().optional().describe('Whether the node was deleted'),
      actionPerformed: z
        .string()
        .optional()
        .describe('Action that was performed (start, stop, suspend)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let nodes = await client.listNodes(ctx.input.consortiumId, ctx.input.environmentId);
      let mapped = nodes.map((n: any) => ({
        nodeId: n._id,
        name: n.name,
        membershipId: n.membership_id || undefined,
        role: n.role || undefined,
        state: n.state || undefined,
        size: n.size || undefined,
        provider: n.provider || undefined,
        urls: n.urls || undefined
      }));

      return {
        output: { nodes: mapped },
        message: `Found **${mapped.length}** node(s).${mapped.length > 0 ? ` ${mapped.map(n => `**${n.name}** (${n.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required');
      if (!ctx.input.membershipId) throw new Error('Membership ID is required');

      let result = await client.createNode(ctx.input.consortiumId, ctx.input.environmentId, {
        name: ctx.input.name,
        membership_id: ctx.input.membershipId,
        role: ctx.input.role,
        size: ctx.input.size
      });

      return {
        output: {
          nodeId: result._id,
          name: result.name,
          membershipId: result.membership_id,
          role: result.role,
          state: result.state,
          size: result.size,
          urls: result.urls
        },
        message: `Created node **${result.name}** (\`${result._id}\`).`
      };
    }

    if (!ctx.input.nodeId) throw new Error('Node ID is required');

    if (ctx.input.action === 'get') {
      let result = await client.getNode(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId
      );
      return {
        output: {
          nodeId: result._id,
          name: result.name,
          membershipId: result.membership_id,
          role: result.role,
          state: result.state,
          size: result.size,
          urls: result.urls
        },
        message: `Node **${result.name}** — role: ${result.role || 'default'}, state: ${result.state || 'unknown'}.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateParams: { name?: string; role?: string; size?: string } = {};
      if (ctx.input.name) updateParams.name = ctx.input.name;
      if (ctx.input.role) updateParams.role = ctx.input.role;
      if (ctx.input.size) updateParams.size = ctx.input.size;

      let result = await client.updateNode(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId,
        updateParams
      );
      return {
        output: {
          nodeId: result._id,
          name: result.name,
          membershipId: result.membership_id,
          role: result.role,
          state: result.state,
          size: result.size,
          urls: result.urls
        },
        message: `Updated node **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteNode(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId
      );
      return {
        output: {
          nodeId: ctx.input.nodeId,
          deleted: true
        },
        message: `Deleted node \`${ctx.input.nodeId}\`.`
      };
    }

    // start, stop, suspend
    await client.performNodeAction(
      ctx.input.consortiumId,
      ctx.input.environmentId,
      ctx.input.nodeId,
      ctx.input.action
    );
    return {
      output: {
        nodeId: ctx.input.nodeId,
        actionPerformed: ctx.input.action
      },
      message: `Performed **${ctx.input.action}** on node \`${ctx.input.nodeId}\`.`
    };
  })
  .build();
