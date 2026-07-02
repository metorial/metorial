import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let refreshNftMetadata = SlateTool.create(spec, {
  name: 'Refresh NFT Metadata',
  key: 'refresh_nft_metadata',
  description: `Request OpenSea to refresh the metadata for a specific NFT. This triggers a re-fetch of the token's metadata from its tokenURI, ensuring the latest on-chain state is reflected on OpenSea.`,
  constraints: ['The refresh is asynchronous — metadata may not be updated immediately.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chain: z
        .string()
        .optional()
        .describe(
          'Blockchain the NFT is on (e.g. ethereum, polygon). Defaults to config chain or ethereum.'
        ),
      contractAddress: z.string().describe('The smart contract address of the NFT'),
      tokenIdentifier: z.string().describe('The token ID of the NFT')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the refresh request was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let chain = ctx.input.chain || ctx.config.chain || 'ethereum';

    await client.refreshNftMetadata(
      chain,
      ctx.input.contractAddress,
      ctx.input.tokenIdentifier
    );

    return {
      output: {
        success: true
      },
      message: `Metadata refresh requested for NFT \`${ctx.input.tokenIdentifier}\` at contract \`${ctx.input.contractAddress}\` on ${chain}. The update may take a few moments.`
    };
  })
  .build();
