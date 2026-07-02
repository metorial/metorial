import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let listSmartContracts = SlateTool.create(spec, {
  name: 'List Smart Contracts',
  key: 'list_smart_contracts',
  description: `Retrieve smart contracts from your Starton project. Can list all contracts, filter by network, or get details for a specific contract including its available functions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      network: z.string().optional().describe('Filter by blockchain network'),
      contractAddress: z
        .string()
        .optional()
        .describe('Specific contract address to get details for (requires network)'),
      includeFunctions: z
        .boolean()
        .default(false)
        .describe('Whether to include available functions for a specific contract'),
      limit: z.number().default(20).describe('Number of contracts to return'),
      page: z.number().default(0).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contracts: z
        .array(
          z.object({
            contractAddress: z.string().describe('Contract address'),
            network: z.string().describe('Blockchain network'),
            name: z.string().describe('Contract name'),
            description: z.string().optional().describe('Contract description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of smart contracts'),
      availableFunctions: z
        .array(z.any())
        .optional()
        .describe('Available functions if requested for a specific contract'),
      totalCount: z.number().optional().describe('Total number of contracts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    if (ctx.input.contractAddress && ctx.input.network) {
      let contract = await client.getSmartContract(
        ctx.input.network,
        ctx.input.contractAddress
      );
      let functions: any[] | undefined;

      if (ctx.input.includeFunctions) {
        functions = await client.getAvailableFunctions(
          ctx.input.network,
          ctx.input.contractAddress
        );
      }

      return {
        output: {
          contracts: [
            {
              contractAddress: contract.address || ctx.input.contractAddress,
              network: contract.network || ctx.input.network,
              name: contract.name || '',
              description: contract.description,
              createdAt: contract.createdAt
            }
          ],
          availableFunctions: functions,
          totalCount: 1
        },
        message: `Retrieved contract **${contract.name}** at \`${ctx.input.contractAddress}\` on ${ctx.input.network}.${functions ? ` Found ${Array.isArray(functions) ? functions.length : 0} available functions.` : ''}`
      };
    }

    let result = await client.listSmartContracts({
      limit: ctx.input.limit,
      page: ctx.input.page,
      network: ctx.input.network
    });

    let items = result.items || result || [];

    return {
      output: {
        contracts: items.map((c: any) => ({
          contractAddress: c.address || '',
          network: c.network || '',
          name: c.name || '',
          description: c.description,
          createdAt: c.createdAt
        })),
        availableFunctions: undefined,
        totalCount: result.meta?.totalCount || items.length
      },
      message: `Found **${items.length}** smart contracts${ctx.input.network ? ` on ${ctx.input.network}` : ''}.`
    };
  })
  .build();
