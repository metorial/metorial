import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

let oracleSchema = z.object({
  chainId: z.number().describe('Network chain identifier'),
  label: z.string().describe('Human-readable network name'),
  name: z.string().describe('Internal blockchain name'),
  network: z.string().describe('Network designation (e.g., "mainnet")'),
  addressByVersion: z
    .record(z.string(), z.string())
    .describe('Oracle contract addresses keyed by version (e.g., {"2": "0x..."})'),
  rpcUrl: z.string().describe('Public RPC endpoint for the chain'),
  blockExplorerUrl: z.string().describe('Block explorer URL for the chain'),
  arch: z.string().describe('Blockchain architecture (e.g., "evm")'),
  icon: z.string().describe('Chain icon URL'),
  testnet: z.boolean().describe('Whether this is a testnet')
});

export let listGasOracles = SlateTool.create(spec, {
  name: 'List Gas Oracles',
  key: 'list_gas_oracles',
  description: `Lists all on-chain gas estimation oracle contracts supported by Blocknative. Returns metadata including oracle contract addresses by version, RPC URLs, and block explorer links for each supported chain. Useful for interacting with on-chain gas oracles directly.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      oracles: z.array(oracleSchema).describe('List of all supported gas oracle contracts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let oracles = await client.getOracles();

    let labels = oracles
      .slice(0, 10)
      .map(o => o.label)
      .join(', ');
    let moreCount = oracles.length > 10 ? oracles.length - 10 : 0;
    let suffix = moreCount > 0 ? `, and ${moreCount} more` : '';

    return {
      output: { oracles },
      message: `Found **${oracles.length}** gas oracle contracts: ${labels}${suffix}.`
    };
  })
  .build();
