import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

export let newContracts = SlateTrigger.create(spec, {
  name: 'New Contract Deployed',
  key: 'new_contracts',
  description:
    'Triggers when a new smart contract (collection) is deployed in the project. Polls for newly deployed contracts.'
})
  .input(
    z.object({
      chainId: z.number().optional().describe('Chain ID of the contract'),
      contractAddress: z.string().describe('Contract address'),
      name: z.string().optional().describe('Contract name'),
      symbol: z.string().optional().describe('Contract symbol'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Contract metadata')
    })
  )
  .output(
    z.object({
      chainId: z.number().optional().describe('Chain ID where the contract is deployed'),
      contractAddress: z.string().describe('Deployed contract address'),
      name: z.string().optional().describe('Contract name'),
      symbol: z.string().optional().describe('Contract symbol'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Contract metadata')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new OwlClient({ token: ctx.auth.token });

      let result = await client.listContractsMetadata();
      let contracts = Array.isArray(result) ? result : (result?.items ?? []);

      let knownAddresses: string[] = (ctx.state?.knownAddresses as string[]) ?? [];
      let knownSet = new Set(knownAddresses);

      let newContracts = contracts.filter(
        (c: { address?: string }) => c.address && !knownSet.has(c.address)
      );

      let allAddresses = contracts
        .map((c: { address?: string }) => c.address)
        .filter((a: string | undefined): a is string => !!a);

      return {
        inputs: newContracts.map(
          (c: {
            chainId?: number;
            address?: string;
            name?: string;
            symbol?: string;
            metadata?: Record<string, unknown>;
          }) => ({
            chainId: c.chainId,
            contractAddress: c.address!,
            name: c.name,
            symbol: c.symbol,
            metadata: c.metadata
          })
        ),
        updatedState: {
          knownAddresses: allAddresses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contract.deployed',
        id: `${ctx.input.chainId ?? 'unknown'}-${ctx.input.contractAddress}`,
        output: {
          chainId: ctx.input.chainId,
          contractAddress: ctx.input.contractAddress,
          name: ctx.input.name,
          symbol: ctx.input.symbol,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
