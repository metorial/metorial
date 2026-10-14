import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let listNetworks = SlateTool.create(spec, {
  name: 'List Networks',
  key: 'list_networks',
  description:
    'List supported blockchain networks, including their names, chain IDs, native currencies, testnet status, and enabled services. Use the network name with contract and balance tools.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      testnet: z
        .boolean()
        .optional()
        .describe('Filter to test networks or production networks'),
      deprecated: z.boolean().optional().describe('Filter by network deprecation status'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(2500)
        .default(100)
        .describe('Number of networks per page'),
      page: z.number().int().min(0).default(0).describe('Zero-based page number')
    })
  )
  .output(
    z.object({
      networks: z.array(
        z.object({
          name: z.string().describe('Network name accepted by contract and balance tools'),
          displayName: z.string().describe('Human-readable network name'),
          chainId: z.number().describe('EVM chain ID'),
          symbol: z.string().describe('Native currency symbol'),
          decimal: z.number().describe('Native currency decimal precision'),
          testnet: z.boolean(),
          deprecated: z.boolean(),
          enableRelayer: z.boolean().describe('Whether transaction relaying is enabled'),
          enableListener: z.boolean().describe('Whether blockchain monitoring is enabled')
        })
      ),
      totalCount: z.number().optional().describe('Total matching networks'),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new StartonClient({ token: ctx.auth.token }).listNetworks(ctx.input);
    return {
      output: {
        networks: result.items.map(
          (network: {
            name: string;
            displayName: string;
            chainId: number;
            symbol: string;
            decimal: number;
            testnet: boolean;
            deprecated: boolean;
            enableRelayer: boolean;
            enableListener: boolean;
          }) => ({
            name: network.name,
            displayName: network.displayName,
            chainId: network.chainId,
            symbol: network.symbol,
            decimal: network.decimal,
            testnet: network.testnet,
            deprecated: network.deprecated,
            enableRelayer: network.enableRelayer,
            enableListener: network.enableListener
          })
        ),
        totalCount: result.meta?.totalItems ?? result.items.length,
        currentPage: result.meta?.currentPage,
        totalPages: result.meta?.totalPages
      },
      message: `Found ${result.items.length} supported networks.`
    };
  })
  .build();
