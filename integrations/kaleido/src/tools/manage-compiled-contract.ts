import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { consortiumId, contractProjectId, environmentId, membershipId } from '../lib/schemas';
import { spec } from '../spec';

export let manageCompiledContract = SlateTool.create(spec, {
  name: 'Manage Compiled Contract',
  key: 'manage_compiled_contract',
  description: `Upload, list, retrieve, promote, or delete compiled smart contracts. Compile Solidity from a GitHub file or import pre-compiled ABI/bytecode to generate REST APIs through the Kaleido API Gateway.
Call manage_contract_project with action list to discover the required project ID. Promoting a contract makes it available for deployment via the gateway with auto-generated OpenAPI documentation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'promote', 'delete'])
        .describe('Action to perform'),
      consortiumId,
      environmentId: environmentId
        .optional()
        .describe(
          'Target environment ID for promote. Discover it with manage_environment action list.'
        ),
      contractProjectId: contractProjectId.optional(),
      membershipId: membershipId
        .optional()
        .describe(
          'Owning membership for create. Discover it with manage_membership action list.'
        ),
      contractId: z
        .string()
        .optional()
        .describe('Compiled contract ID (required for get, promote, delete)'),
      name: z
        .string()
        .optional()
        .describe(
          'Solidity contract name for GitHub compilation; required when the file defines multiple contracts'
        ),
      description: z.string().optional().describe('Contract description'),
      source: z
        .string()
        .optional()
        .describe(
          'Legacy raw Solidity source field. Use contractUrl to compile a GitHub file, or provide ABI and bytecode.'
        ),
      abi: z.any().optional().describe('Pre-compiled contract ABI (JSON array)'),
      bytecode: z.string().optional().describe('Pre-compiled contract bytecode'),
      contractType: z
        .string()
        .optional()
        .describe(
          'Optional expected project type: github or precompiled; must match the contract project'
        ),
      contractUrl: z
        .string()
        .optional()
        .describe('GitHub URL of the Solidity file for a github project'),
      endpoint: z.string().optional().describe('Friendly Gateway API path for promote')
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
      contractId: z.string().optional().describe('Compiled contract ID'),
      contractProjectId: z.string().optional().describe('Parent contract project ID'),
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

    if (!ctx.input.contractProjectId) {
      throw createApiServiceError(
        'Provide contractProjectId. Discover projects with manage_contract_project action list.',
        { reason: 'invalid_input' }
      );
    }

    if (ctx.input.action === 'list') {
      let contracts = await client.listCompiledContracts(
        ctx.input.consortiumId,
        ctx.input.contractProjectId
      );
      let mapped = contracts.map((c: any) => ({
        contractId: c._id,
        name: c.name ?? c.contract_name ?? c.description ?? c._id,
        description: c.description ?? undefined,
        contractType: c.type ?? undefined,
        state: c.state ?? undefined,
        createdAt: c.created_at ?? undefined
      }));

      return {
        output: { contracts: mapped, contractProjectId: ctx.input.contractProjectId },
        message: `Found **${mapped.length}** compiled contract(s).${mapped.length > 0 ? ` ${mapped.map(c => `**${c.name}** (${c.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.description?.trim() || !ctx.input.membershipId) {
        throw createApiServiceError(
          'Provide description and membershipId when creating a compiled contract.',
          { reason: 'invalid_input' }
        );
      }
      if (ctx.input.source !== undefined) {
        throw createApiServiceError(
          'The platform API compiles a GitHub file using contractUrl. For locally compiled Solidity, provide abi and bytecode.',
          { reason: 'unsupported_source' }
        );
      }
      let project = await client.getContractProject(
        ctx.input.consortiumId,
        ctx.input.contractProjectId
      );
      if (ctx.input.contractType && ctx.input.contractType !== project.type) {
        throw createApiServiceError(
          'contractType must match the selected contract project type.',
          { reason: 'invalid_input' }
        );
      }
      let abi: string | undefined;
      if (project.type === 'github') {
        if (
          !ctx.input.contractUrl ||
          ctx.input.abi !== undefined ||
          ctx.input.bytecode !== undefined
        ) {
          throw createApiServiceError(
            'For a github project, provide contractUrl and omit abi and bytecode.',
            { reason: 'invalid_input' }
          );
        }
        let url = z.url().safeParse(ctx.input.contractUrl);
        if (!url.success) {
          throw createApiServiceError('contractUrl must be a valid GitHub file URL.', {
            reason: 'invalid_input'
          });
        }
      } else if (project.type === 'precompiled') {
        if (
          ctx.input.abi === undefined ||
          !ctx.input.bytecode ||
          ctx.input.contractUrl !== undefined
        ) {
          throw createApiServiceError(
            'For a precompiled project, provide abi and bytecode and omit contractUrl.',
            { reason: 'invalid_input' }
          );
        }
        let parsedAbi: unknown;
        try {
          parsedAbi =
            typeof ctx.input.abi === 'string' ? JSON.parse(ctx.input.abi) : ctx.input.abi;
        } catch {
          throw createApiServiceError(
            'abi must be a JSON array or a JSON string containing an array.',
            { reason: 'invalid_input' }
          );
        }
        if (!Array.isArray(parsedAbi)) {
          throw createApiServiceError(
            'abi must be a JSON array or a JSON string containing an array.',
            { reason: 'invalid_input' }
          );
        }
        abi = JSON.stringify(parsedAbi);
      } else {
        throw createApiServiceError(
          'This tool creates github or precompiled Solidity versions. Binary contract projects require the Kaleido upload workflow.',
          { reason: 'unsupported_project_type' }
        );
      }
      let result = await client.createCompiledContract(
        ctx.input.consortiumId,
        ctx.input.contractProjectId,
        {
          description: ctx.input.description,
          membership_id: ctx.input.membershipId,
          contract_url: project.type === 'github' ? ctx.input.contractUrl : undefined,
          contract_name: project.type === 'github' ? ctx.input.name : undefined,
          abi,
          bytecode: project.type === 'precompiled' ? ctx.input.bytecode : undefined
        }
      );
      return {
        output: {
          contractId: result._id,
          contractProjectId: ctx.input.contractProjectId,
          name: result.name ?? result.contract_name ?? undefined,
          description: result.description ?? undefined,
          state: result.state ?? undefined,
          abi: result.abi,
          bytecode: result.bytecode ?? undefined
        },
        message: `Created compiled contract version \`${result._id}\`.`
      };
    }

    if (!ctx.input.contractId)
      throw createApiServiceError('Contract ID is required', { reason: 'invalid_input' });

    if (ctx.input.action === 'get') {
      let result = await client.getCompiledContract(
        ctx.input.consortiumId,
        ctx.input.contractProjectId,
        ctx.input.contractId
      );
      return {
        output: {
          contractId: result._id,
          contractProjectId: ctx.input.contractProjectId,
          name: result.name ?? result.contract_name ?? undefined,
          description: result.description ?? undefined,
          state: result.state ?? undefined,
          abi: result.abi,
          bytecode: result.bytecode ?? undefined
        },
        message: `Compiled contract \`${result._id}\` — state: ${result.state || 'unknown'}.`
      };
    }

    if (ctx.input.action === 'promote') {
      if (!ctx.input.environmentId) {
        throw createApiServiceError(
          'Provide environmentId for promotion. Discover environments with manage_environment action list.',
          { reason: 'invalid_input' }
        );
      }
      let result = await client.promoteCompiledContract(
        ctx.input.consortiumId,
        ctx.input.contractProjectId,
        ctx.input.contractId,
        { environment_id: ctx.input.environmentId, endpoint: ctx.input.endpoint }
      );
      return {
        output: {
          contractId: ctx.input.contractId,
          contractProjectId: ctx.input.contractProjectId,
          promoted: true,
          state: result?.state || 'promoted'
        },
        message: `Promoted contract \`${ctx.input.contractId}\` — now available for deployment via the API Gateway.`
      };
    }

    // delete
    await client.deleteCompiledContract(
      ctx.input.consortiumId,
      ctx.input.contractProjectId,
      ctx.input.contractId
    );
    return {
      output: {
        contractId: ctx.input.contractId,
        contractProjectId: ctx.input.contractProjectId,
        deleted: true
      },
      message: `Deleted compiled contract \`${ctx.input.contractId}\`.`
    };
  })
  .build();
