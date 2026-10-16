import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  OwlClient,
  owlNumber,
  owlObject,
  owlString,
  requireChainId,
  requireInput,
  requireMetadata
} from '../lib/client';
import { listInputSchema, rawSchema } from '../lib/schemas';
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
      raw: rawSchema,
      chainId: z.number().optional().describe('Chain ID'),
      contractAddress: z.string().optional().describe('Contract address'),
      name: z.string().optional().describe('Contract name'),
      symbol: z.string().optional().describe('Contract symbol'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Contract metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let chainId = requireChainId(ctx.input.chainId ?? ctx.config.chainId);
    requireInput(ctx.input.contractAddress, 'contractAddress');

    let result = await client.getContractMetadata({
      chainId,
      contractAddress: ctx.input.contractAddress
    });

    return {
      output: {
        raw: result,
        chainId: result.chainId === undefined ? chainId : owlNumber(result.chainId),
        contractAddress:
          result.address === undefined ? ctx.input.contractAddress : owlString(result.address),
        name: owlString(result.name) ?? owlString(owlObject(result.metadata)?.name),
        symbol: owlString(result.symbol),
        metadata: result.metadata === undefined ? result : owlObject(result.metadata)
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
      raw: rawSchema,
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

    let chainId = requireChainId(ctx.input.chainId ?? ctx.config.chainId);
    requireInput(ctx.input.contractAddress, 'contractAddress');

    ctx.info({
      message: 'Updating contract metadata',
      contractAddress: ctx.input.contractAddress
    });

    requireMetadata(ctx.input.metadata);
    let result = await client.patchContractMetadata({
      chainId,
      contractAddress: ctx.input.contractAddress,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        raw: result,
        chainId: result.chainId === undefined ? chainId : owlNumber(result.chainId),
        contractAddress:
          result.address === undefined ? ctx.input.contractAddress : owlString(result.address),
        metadata: result.metadata === undefined ? result : owlObject(result.metadata)
      },
      message: `Updated metadata for contract \`${ctx.input.contractAddress}\` on chain ${chainId}.`
    };
  })
  .build();

export let listContracts = SlateTool.create(spec, {
  name: 'List Contracts',
  key: 'list_contracts',
  description: `List a page of contract metadata records within the project. Use list_project_contracts to discover deployed contract addresses and chain IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(listInputSchema)
  .output(
    z.object({
      raw: rawSchema,
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

    let contracts = await client.listContractsMetadata(ctx.input);

    let mapped = contracts.map(c => ({
      chainId: owlNumber(c.chainId),
      contractAddress: owlString(c.address),
      name: owlString(c.name) ?? owlString(owlObject(c.metadata)?.name),
      symbol: owlString(c.symbol),
      metadata: owlObject(c.metadata)
    }));

    return {
      output: { contracts: mapped, raw: contracts },
      message: `Found **${mapped.length}** contract metadata record(s).`
    };
  })
  .build();
