import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageCompiledContract = SlateTool.create(spec, {
  name: 'Manage Compiled Contract',
  key: 'manage_compiled_contract',
  description: `Upload, list, retrieve, promote, or delete compiled smart contracts. Upload Solidity source or pre-compiled ABI/bytecode to generate REST APIs through the Kaleido API Gateway.
Promoting a contract makes it available for deployment via the gateway with auto-generated OpenAPI documentation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'promote', 'delete'])
        .describe('Action to perform'),
      consortiumId: z.string().describe('Consortium ID'),
      environmentId: z.string().describe('Environment ID'),
      contractId: z
        .string()
        .optional()
        .describe('Compiled contract ID (required for get, promote, delete)'),
      name: z.string().optional().describe('Contract name (required for create)'),
      description: z.string().optional().describe('Contract description'),
      source: z.string().optional().describe('Solidity source code'),
      abi: z.any().optional().describe('Pre-compiled contract ABI (JSON array)'),
      bytecode: z.string().optional().describe('Pre-compiled contract bytecode'),
      contractType: z.string().optional().describe('Contract type identifier')
    })
  )
  .output(
    z.object({
      contracts: z
        .array(
          z.object({
            contractId: z.string().describe('Contract ID'),
            name: z.string().describe('Contract name'),
            description: z.string().optional().describe('Contract description'),
            contractType: z.string().optional().describe('Contract type'),
            state: z
              .string()
              .optional()
              .describe('Contract state (created, compiled, promoted)'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of contracts (for list action)'),
      contractId: z.string().optional().describe('Contract ID'),
      name: z.string().optional().describe('Contract name'),
      description: z.string().optional().describe('Contract description'),
      state: z.string().optional().describe('Contract state'),
      abi: z.any().optional().describe('Contract ABI'),
      bytecode: z.string().optional().describe('Contract bytecode'),
      promoted: z.boolean().optional().describe('Whether the contract was promoted'),
      deleted: z.boolean().optional().describe('Whether the contract was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let contracts = await client.listCompiledContracts(
        ctx.input.consortiumId,
        ctx.input.environmentId
      );
      let mapped = contracts.map((c: any) => ({
        contractId: c._id,
        name: c.name,
        description: c.description || undefined,
        contractType: c.type || undefined,
        state: c.state || undefined,
        createdAt: c.created_at || undefined
      }));

      return {
        output: { contracts: mapped },
        message: `Found **${mapped.length}** compiled contract(s).${mapped.length > 0 ? ` ${mapped.map(c => `**${c.name}** (${c.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required');

      let result = await client.createCompiledContract(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        {
          name: ctx.input.name,
          description: ctx.input.description,
          type: ctx.input.contractType,
          source: ctx.input.source,
          abi: ctx.input.abi,
          bytecode: ctx.input.bytecode
        }
      );

      return {
        output: {
          contractId: result._id,
          name: result.name,
          description: result.description,
          state: result.state,
          abi: result.abi,
          bytecode: result.bytecode
        },
        message: `Created compiled contract **${result.name}** (\`${result._id}\`).`
      };
    }

    if (!ctx.input.contractId) throw new Error('Contract ID is required');

    if (ctx.input.action === 'get') {
      let result = await client.getCompiledContract(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.contractId
      );
      return {
        output: {
          contractId: result._id,
          name: result.name,
          description: result.description,
          state: result.state,
          abi: result.abi,
          bytecode: result.bytecode
        },
        message: `Contract **${result.name}** — state: ${result.state || 'unknown'}.`
      };
    }

    if (ctx.input.action === 'promote') {
      let result = await client.promoteCompiledContract(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.contractId
      );
      return {
        output: {
          contractId: ctx.input.contractId,
          promoted: true,
          state: result?.state || 'promoted'
        },
        message: `Promoted contract \`${ctx.input.contractId}\` — now available for deployment via the API Gateway.`
      };
    }

    // delete
    await client.deleteCompiledContract(
      ctx.input.consortiumId,
      ctx.input.environmentId,
      ctx.input.contractId
    );
    return {
      output: {
        contractId: ctx.input.contractId,
        deleted: true
      },
      message: `Deleted compiled contract \`${ctx.input.contractId}\`.`
    };
  })
  .build();
