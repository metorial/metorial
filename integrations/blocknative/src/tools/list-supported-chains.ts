import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

let chainSchema = z.object({
  arch: z.string().describe('Blockchain architecture (e.g., "evm")'),
  chainId: z.number().describe('Unique numeric chain identifier'),
  label: z.string().describe('Human-readable blockchain name'),
  features: z
    .array(z.string())
    .describe('Supported Blocknative features (e.g., ["blockprices"])'),
  icon: z.string().describe('URL to the chain icon'),
  system: z.string().describe('Ecosystem identifier (e.g., "ethereum", "polygon")'),
  network: z.string().describe('Network designation (e.g., "main")')
});

export let listSupportedChains = SlateTool.create(spec, {
  name: 'List Supported Chains',
  key: 'list_supported_chains',
  description: `Lists all blockchain networks supported by Blocknative with their metadata including chain ID, architecture, available features, and system/network identifiers. Use this to discover which chains are available for gas estimation and other Blocknative services.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      chains: z.array(chainSchema).describe('List of all supported blockchain networks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let chains = await client.getChains();

    let labels = chains
      .slice(0, 10)
      .map(c => c.label)
      .join(', ');
    let moreCount = chains.length > 10 ? chains.length - 10 : 0;
    let suffix = moreCount > 0 ? `, and ${moreCount} more` : '';

    return {
      output: { chains },
      message: `Found **${chains.length}** supported chains: ${labels}${suffix}.`
    };
  })
  .build();
