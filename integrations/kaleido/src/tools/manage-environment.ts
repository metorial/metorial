import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironment = SlateTool.create(spec, {
  name: 'Manage Environment',
  key: 'manage_environment',
  description: `Create, update, list, retrieve, or delete blockchain environments within a consortium. An environment is an isolated blockchain runtime with its own ledger, nodes, and services.
Configure the blockchain protocol (Geth, Quorum, Besu, Corda, Fabric) and consensus algorithm (PoA, Raft, IBFT) when creating.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Action to perform'),
      consortiumId: z.string().describe('Consortium ID'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID (required for get, update, delete)'),
      name: z.string().optional().describe('Environment name (required for create)'),
      description: z.string().optional().describe('Environment description'),
      provider: z
        .enum(['geth', 'quorum', 'besu', 'corda', 'fabric'])
        .optional()
        .describe('Blockchain protocol (required for create)'),
      consensusType: z
        .enum(['poa', 'raft', 'ibft'])
        .optional()
        .describe('Consensus algorithm (required for create)'),
      blockPeriod: z.number().optional().describe('Block period in seconds'),
      chainId: z.number().optional().describe('Custom chain ID')
    })
  )
  .output(
    z.object({
      environments: z
        .array(
          z.object({
            environmentId: z.string().describe('Environment ID'),
            name: z.string().describe('Environment name'),
            description: z.string().optional().describe('Environment description'),
            provider: z.string().optional().describe('Blockchain protocol'),
            consensusType: z.string().optional().describe('Consensus algorithm'),
            state: z
              .string()
              .optional()
              .describe('Current state (setup, initializing, live, deleted)'),
            releaseId: z.string().optional().describe('Protocol release ID'),
            chainId: z.number().optional().describe('Chain ID'),
            blockPeriod: z.number().optional().describe('Block period in seconds'),
            nodeCount: z.number().optional().describe('Number of nodes'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of environments (for list action)'),
      environmentId: z.string().optional().describe('Environment ID'),
      name: z.string().optional().describe('Environment name'),
      description: z.string().optional().describe('Environment description'),
      provider: z.string().optional().describe('Blockchain protocol'),
      consensusType: z.string().optional().describe('Consensus algorithm'),
      state: z.string().optional().describe('Current state'),
      chainId: z.number().optional().describe('Chain ID'),
      deleted: z.boolean().optional().describe('Whether the environment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let environments = await client.listEnvironments(ctx.input.consortiumId);
      let mapped = environments.map((e: any) => ({
        environmentId: e._id,
        name: e.name,
        description: e.description || undefined,
        provider: e.provider || undefined,
        consensusType: e.consensus_type || undefined,
        state: e.state || undefined,
        releaseId: e.release_id || undefined,
        chainId: e.chain_id || undefined,
        blockPeriod: e.block_period || undefined,
        nodeCount: e.node_list?.length || undefined,
        createdAt: e.created_at || undefined
      }));

      return {
        output: { environments: mapped },
        message: `Found **${mapped.length}** environment(s).${mapped.length > 0 ? ` ${mapped.map(e => `**${e.name}** (${e.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required');
      if (!ctx.input.provider) throw new Error('Provider is required');
      if (!ctx.input.consensusType) throw new Error('Consensus type is required');

      let result = await client.createEnvironment(ctx.input.consortiumId, {
        name: ctx.input.name,
        description: ctx.input.description,
        provider: ctx.input.provider,
        consensus_type: ctx.input.consensusType,
        block_period: ctx.input.blockPeriod,
        chain_id: ctx.input.chainId
      });

      return {
        output: {
          environmentId: result._id,
          name: result.name,
          description: result.description,
          provider: result.provider,
          consensusType: result.consensus_type,
          state: result.state,
          chainId: result.chain_id
        },
        message: `Created environment **${result.name}** (\`${result._id}\`) with ${result.provider}/${result.consensus_type}.`
      };
    }

    if (!ctx.input.environmentId) throw new Error('Environment ID is required');

    if (ctx.input.action === 'get') {
      let result = await client.getEnvironment(
        ctx.input.consortiumId,
        ctx.input.environmentId
      );
      return {
        output: {
          environmentId: result._id,
          name: result.name,
          description: result.description,
          provider: result.provider,
          consensusType: result.consensus_type,
          state: result.state,
          chainId: result.chain_id
        },
        message: `Environment **${result.name}** — ${result.provider}/${result.consensus_type}, state: ${result.state || 'unknown'}.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateParams: { name?: string; description?: string } = {};
      if (ctx.input.name) updateParams.name = ctx.input.name;
      if (ctx.input.description !== undefined)
        updateParams.description = ctx.input.description;

      let result = await client.updateEnvironment(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        updateParams
      );
      return {
        output: {
          environmentId: result._id,
          name: result.name,
          description: result.description,
          provider: result.provider,
          consensusType: result.consensus_type,
          state: result.state,
          chainId: result.chain_id
        },
        message: `Updated environment **${result.name}**.`
      };
    }

    // delete
    await client.deleteEnvironment(ctx.input.consortiumId, ctx.input.environmentId);
    return {
      output: {
        environmentId: ctx.input.environmentId,
        deleted: true
      },
      message: `Deleted environment \`${ctx.input.environmentId}\`.`
    };
  })
  .build();
