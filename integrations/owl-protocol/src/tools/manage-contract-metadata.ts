import { SlateTool } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

export let getContractMetadata = SlateTool.create(spec, {
  name: 'Get Contract Metadata',
  key: 'get_contract_metadata',
  description: `Retrieve metadata for a deployed smart contract, including its name, description, image, and other on-chain/off-chain metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chainId: z.number().describe('Chain ID where the contract is deployed'),
      contractAddress: z.string().describe('Contract address to retrieve metadata for')
    })
  )
  .output(
    z.object({
      chainId: z.number().optional().describe('Chain ID'),
      contractAddress: z.string().optional().describe('Contract address'),
      name: z.string().optional().describe('Contract name'),
      symbol: z.string().optional().describe('Contract symbol'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Contract metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let chainId = ctx.input.chainId ?? ctx.config.chainId;
    if (!chainId) {
      throw new Error('chainId is required.');
    }

    let result = await client.getContractMetadata({
      chainId,
      contractAddress: ctx.input.contractAddress
    });

    return {
      output: {
        chainId: result.chainId ?? chainId,
        contractAddress: result.address ?? ctx.input.contractAddress,
        name: result.name,
        symbol: result.symbol,
        metadata: result.metadata ?? result
      },
      message: `Retrieved metadata for contract \`${ctx.input.contractAddress}\` on chain ${chainId}.`
    };
  })
  .build();

export let updateContractMetadata = SlateTool.create(spec, {
  name: 'Update Contract Metadata',
  key: 'update_contract_metadata',
  description: `Update metadata fields of a deployed smart contract. Modifies specified fields while keeping other fields intact.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chainId: z.number().describe('Chain ID where the contract is deployed'),
      contractAddress: z.string().describe('Contract address to update metadata for'),
      metadata: z
        .record(z.string(), z.unknown())
        .describe('Metadata fields to update (e.g. name, description, image)')
    })
  )
  .output(
    z.object({
      chainId: z.number().optional().describe('Chain ID'),
      contractAddress: z.string().optional().describe('Contract address'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated contract metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let chainId = ctx.input.chainId ?? ctx.config.chainId;
    if (!chainId) {
      throw new Error('chainId is required.');
    }

    ctx.info({
      message: 'Updating contract metadata',
      contractAddress: ctx.input.contractAddress
    });

    let result = await client.patchContractMetadata({
      chainId,
      contractAddress: ctx.input.contractAddress,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        chainId: result.chainId ?? chainId,
        contractAddress: result.address ?? ctx.input.contractAddress,
        metadata: result.metadata ?? result
      },
      message: `Updated metadata for contract \`${ctx.input.contractAddress}\` on chain ${chainId}.`
    };
  })
  .build();

export let listContracts = SlateTool.create(spec, {
  name: 'List Contracts',
  key: 'list_contracts',
  description: `List all deployed smart contracts and their metadata within the project. Returns contract addresses, names, symbols, and chain information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contracts: z
        .array(
          z.object({
            chainId: z.number().optional().describe('Chain ID'),
            contractAddress: z.string().optional().describe('Contract address'),
            name: z.string().optional().describe('Contract name'),
            symbol: z.string().optional().describe('Contract symbol'),
            metadata: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Contract metadata')
          })
        )
        .describe('List of deployed contracts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let result = await client.listContractsMetadata();
    let contracts = Array.isArray(result) ? result : (result.items ?? []);

    let mapped = contracts.map(
      (c: {
        chainId?: number;
        address?: string;
        name?: string;
        symbol?: string;
        metadata?: Record<string, unknown>;
      }) => ({
        chainId: c.chainId,
        contractAddress: c.address,
        name: c.name,
        symbol: c.symbol,
        metadata: c.metadata
      })
    );

    return {
      output: { contracts: mapped },
      message: `Found **${mapped.length}** deployed contract(s).`
    };
  })
  .build();
