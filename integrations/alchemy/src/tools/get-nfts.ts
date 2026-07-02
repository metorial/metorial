import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getNFTs = SlateTool.create(spec, {
  name: 'Get NFTs',
  key: 'get_nfts',
  description: `Retrieve NFTs owned by a wallet address or fetch detailed metadata for a specific NFT. Supports filtering by contract address, spam detection, and pagination.
Use this to list all NFTs in a wallet, look up a specific NFT's metadata and attributes, or check NFT collection information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownerAddress: z
        .string()
        .optional()
        .describe(
          'Wallet address to get NFTs for. Required if not using contractAddress + tokenId.'
        ),
      contractAddress: z
        .string()
        .optional()
        .describe(
          'NFT contract address. Used with tokenId to get specific NFT metadata, or with ownerAddress to filter owned NFTs.'
        ),
      tokenId: z
        .string()
        .optional()
        .describe(
          'Token ID of a specific NFT. Used with contractAddress to fetch single NFT metadata.'
        ),
      pageSize: z.number().optional().describe('Number of NFTs per page (max 100)'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page'),
      excludeSpam: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to exclude spam NFTs from results'),
      orderBy: z.enum(['transferTime']).optional().describe('Order results by transfer time')
    })
  )
  .output(
    z.object({
      nfts: z
        .array(
          z.object({
            contractAddress: z.string().describe('NFT contract address'),
            tokenId: z.string().describe('NFT token ID'),
            tokenType: z.string().optional().describe('Token standard (ERC721 or ERC1155)'),
            name: z.string().optional().describe('NFT name'),
            description: z.string().optional().describe('NFT description'),
            imageUrl: z.string().optional().describe('NFT image URL'),
            collectionName: z.string().optional().describe('Collection name'),
            floorPrice: z.number().optional().describe('Collection floor price'),
            isSpam: z.boolean().optional().describe('Whether the NFT is classified as spam'),
            attributes: z
              .array(
                z.object({
                  traitType: z.string().optional(),
                  value: z.any().optional()
                })
              )
              .optional()
              .describe('NFT attributes/traits')
          })
        )
        .describe('List of NFTs'),
      totalCount: z.number().optional().describe('Total number of NFTs'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    // Fetch single NFT metadata
    if (ctx.input.contractAddress && ctx.input.tokenId && !ctx.input.ownerAddress) {
      let nft = await client.getNFTMetadata(ctx.input.contractAddress, ctx.input.tokenId);

      let nftResult = {
        contractAddress: nft.contract?.address || ctx.input.contractAddress,
        tokenId: nft.tokenId || ctx.input.tokenId,
        tokenType: nft.tokenType,
        name: nft.name || nft.raw?.metadata?.name,
        description: nft.description || nft.raw?.metadata?.description,
        imageUrl: nft.image?.cachedUrl || nft.image?.originalUrl,
        collectionName: nft.collection?.name || nft.contract?.name,
        floorPrice: nft.collection?.floorPrice,
        isSpam: nft.contract?.isSpam,
        attributes: (nft.raw?.metadata?.attributes || []).map((a: any) => ({
          traitType: a.trait_type,
          value: a.value
        }))
      };

      return {
        output: {
          nfts: [nftResult],
          totalCount: 1
        },
        message: `Fetched metadata for NFT **${nftResult.name || nftResult.tokenId}** from collection \`${nftResult.collectionName || nftResult.contractAddress}\`.`
      };
    }

    // Fetch NFTs for owner
    if (!ctx.input.ownerAddress) {
      throw new Error(
        'Either ownerAddress or both contractAddress and tokenId must be provided.'
      );
    }

    let excludeFilters = ctx.input.excludeSpam ? ['SPAM'] : undefined;
    let contractAddresses = ctx.input.contractAddress
      ? [ctx.input.contractAddress]
      : undefined;

    let result = await client.getNFTsForOwner({
      owner: ctx.input.ownerAddress,
      contractAddresses,
      pageKey: ctx.input.pageKey,
      pageSize: ctx.input.pageSize,
      excludeFilters,
      orderBy: ctx.input.orderBy
    });

    let nfts = (result.ownedNfts || []).map((nft: any) => ({
      contractAddress: nft.contract?.address,
      tokenId: nft.tokenId,
      tokenType: nft.tokenType,
      name: nft.name || nft.raw?.metadata?.name,
      description: nft.description || nft.raw?.metadata?.description,
      imageUrl: nft.image?.cachedUrl || nft.image?.originalUrl,
      collectionName: nft.collection?.name || nft.contract?.name,
      floorPrice: nft.collection?.floorPrice,
      isSpam: nft.contract?.isSpam,
      attributes: (nft.raw?.metadata?.attributes || []).map((a: any) => ({
        traitType: a.trait_type,
        value: a.value
      }))
    }));

    return {
      output: {
        nfts,
        totalCount: result.totalCount,
        pageKey: result.pageKey || undefined
      },
      message: `Found **${result.totalCount ?? nfts.length}** NFT(s) for \`${ctx.input.ownerAddress}\`.${nfts.length > 0 ? ` Showing ${nfts.length} results.` : ''}${result.pageKey ? ' More results available.' : ''}`
    };
  })
  .build();
