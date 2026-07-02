import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nftSummarySchema = z.object({
  identifier: z.string().describe('Token ID'),
  name: z.string().nullable().describe('NFT name'),
  description: z.string().nullable().describe('NFT description'),
  imageUrl: z.string().nullable().describe('Image URL'),
  collection: z.string().describe('Collection slug'),
  contract: z.string().describe('Contract address'),
  tokenStandard: z.string().describe('Token standard'),
  opensea_url: z.string().nullable().describe('OpenSea URL')
});

export let listNfts = SlateTool.create(spec, {
  name: 'List NFTs',
  key: 'list_nfts',
  description: `List NFTs by collection slug, by contract address, or by owner wallet address. Supports cursor-based pagination. Useful for browsing NFTs in a collection, viewing a contract's tokens, or checking what NFTs a wallet holds.`,
  instructions: [
    'Provide exactly one of: collectionSlug, contractAddress (with chain), or ownerAddress (with chain).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      collectionSlug: z.string().optional().describe('Collection slug to list NFTs from'),
      contractAddress: z.string().optional().describe('Contract address to list NFTs from'),
      ownerAddress: z.string().optional().describe('Wallet address to list NFTs owned by'),
      chain: z
        .string()
        .optional()
        .describe(
          'Blockchain (required for contract/owner lookups). Defaults to config chain or ethereum.'
        ),
      filterCollection: z
        .string()
        .optional()
        .describe('When listing by owner, optionally filter to a specific collection slug'),
      limit: z.number().optional().describe('Number of results per page (max 200)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      nfts: z.array(nftSummarySchema).describe('List of NFTs'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let chain = ctx.input.chain || ctx.config.chain || 'ethereum';
    let data: any;

    if (ctx.input.collectionSlug) {
      data = await client.getNftsByCollection(ctx.input.collectionSlug, {
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    } else if (ctx.input.contractAddress) {
      data = await client.getNftsByContract(chain, ctx.input.contractAddress, {
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    } else if (ctx.input.ownerAddress) {
      data = await client.getNftsByAccount(chain, ctx.input.ownerAddress, {
        limit: ctx.input.limit,
        next: ctx.input.cursor,
        collection: ctx.input.filterCollection
      });
    } else {
      throw new Error(
        'Provide at least one of collectionSlug, contractAddress, or ownerAddress.'
      );
    }

    let nfts = (data.nfts ?? []).map((nft: any) => ({
      identifier: nft.identifier,
      name: nft.name ?? null,
      description: nft.description ?? null,
      imageUrl: nft.image_url ?? null,
      collection: nft.collection ?? '',
      contract: nft.contract ?? '',
      tokenStandard: nft.token_standard ?? 'unknown',
      opensea_url: nft.opensea_url ?? null
    }));

    return {
      output: {
        nfts,
        nextCursor: data.next ?? null
      },
      message: `Found **${nfts.length}** NFT(s).${data.next ? ' More results available with the next cursor.' : ''}`
    };
  })
  .build();
