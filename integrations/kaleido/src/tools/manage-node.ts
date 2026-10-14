import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { consortiumId, environmentId } from '../lib/schemas';
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
      consortiumId,
      environmentId,
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
        .describe(
          'Initial consensus role for create. Consensus role changes are not supported by the node update endpoint.'
        ),
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
      deletionRequested: z
        .boolean()
        .optional()
        .describe('Whether Kaleido accepted the deletion request'),
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
        nodeId: n._id ?? n.id,
        name: n.name ?? n._id ?? n.id,
        membershipId: n.membership_id ?? undefined,
        role: n.role ?? undefined,
        state: n.state ?? undefined,
        size: n.size ?? undefined,
        provider: n.provider ?? undefined,
        urls: n.urls ?? undefined
      }));

      return {
        output: { nodes: mapped },
        message: `Found **${mapped.length}** node(s).${mapped.length > 0 ? ` ${mapped.map(n => `**${n.name}** (${n.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name)
        throw createApiServiceError('Name is required', { reason: 'invalid_input' });
      if (!ctx.input.membershipId)
        throw createApiServiceError('Membership ID is required', { reason: 'invalid_input' });

      let result = await client.createNode(ctx.input.consortiumId, ctx.input.environmentId, {
        name: ctx.input.name,
        membership_id: ctx.input.membershipId,
        init_consensus_role: ctx.input.role,
        size: ctx.input.size
      });

      return {
        output: {
          nodeId: result._id ?? result.id,
          name: result.name ?? undefined,
          membershipId: result.membership_id ?? undefined,
          role: result.role ?? undefined,
          state: result.state ?? undefined,
          size: result.size ?? undefined,
          urls: result.urls
        },
        message: `Created node **${result.name}** (\`${result._id}\`).`
      };
    }

    if (!ctx.input.nodeId)
      throw createApiServiceError('Node ID is required', { reason: 'invalid_input' });

    if (ctx.input.action === 'get') {
      let result = await client.getNode(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId
      );
      return {
        output: {
          nodeId: result._id ?? result.id,
          name: result.name ?? undefined,
          membershipId: result.membership_id ?? undefined,
          role: result.role ?? undefined,
          state: result.state ?? undefined,
          size: result.size ?? undefined,
          urls: result.urls
        },
        message: `Node **${result.name}** — role: ${result.role || 'default'}, state: ${result.state || 'unknown'}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (ctx.input.role !== undefined) {
        throw createApiServiceError(
          'role selects the initial consensus role for create. Omit role when updating a node.',
          { reason: 'unsupported_role_update' }
        );
      }
      let updateParams: { name?: string; size?: string } = {};
      if (ctx.input.name) updateParams.name = ctx.input.name;
      if (ctx.input.size) updateParams.size = ctx.input.size;

      let result = await client.updateNode(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId,
        updateParams
      );
      return {
        output: {
          nodeId: result._id ?? result.id,
          name: result.name ?? undefined,
          membershipId: result.membership_id ?? undefined,
          role: result.role ?? undefined,
          state: result.state ?? undefined,
          size: result.size ?? undefined,
          urls: result.urls
        },
        message: `Updated node **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let result = await client.deleteNode(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.nodeId
      );
      return {
        output: {
          nodeId: ctx.input.nodeId,
          deleted: result?.state === 'deleted',
          deletionRequested: true,
          state: result?.state ?? undefined
        },
        message: `Kaleido accepted the deletion request for node \`${ctx.input.nodeId}\`.`
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
      message: `Kaleido accepted the **${ctx.input.action}** request for node \`${ctx.input.nodeId}\`.`
    };
  })
  .build();
