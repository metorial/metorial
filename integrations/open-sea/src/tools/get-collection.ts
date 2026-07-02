import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contractSchema = z.object({
  address: z.string().describe('Contract address'),
  chain: z.string().describe('Blockchain the contract is on')
});

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve detailed information about an NFT collection including its description, images, social links, fees, contracts, and marketplace settings. Also optionally includes collection statistics (floor price, volume, sales count) and trait definitions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      collectionSlug: z.string().describe('The unique slug identifier for the collection'),
      includeStats: z
        .boolean()
        .optional()
        .describe('Whether to also fetch collection statistics (floor price, volume, etc.)'),
      includeTraits: z.boolean().optional().describe('Whether to also fetch trait definitions')
    })
  )
  .output(
    z.object({
      collectionSlug: z.string().describe('Collection slug'),
      name: z.string().describe('Collection name'),
      description: z.string().nullable().describe('Collection description'),
      imageUrl: z.string().nullable().describe('Collection image URL'),
      bannerImageUrl: z.string().nullable().describe('Collection banner image URL'),
      owner: z.string().nullable().describe('Collection owner address'),
      category: z.string().nullable().describe('Collection category'),
      safelistStatus: z.string().nullable().describe('Verification/safelist status'),
      openseaUrl: z.string().nullable().describe('OpenSea URL'),
      projectUrl: z.string().nullable().describe('Project website URL'),
      discordUrl: z.string().nullable().describe('Discord URL'),
      twitterUsername: z.string().nullable().describe('Twitter/X username'),
      contracts: z
        .array(contractSchema)
        .describe('Smart contracts associated with this collection'),
      totalSupply: z.number().nullable().describe('Total supply of NFTs'),
      traitOffersEnabled: z.boolean().nullable().describe('Whether trait offers are enabled'),
      collectionOffersEnabled: z
        .boolean()
        .nullable()
        .describe('Whether collection offers are enabled'),
      stats: z
        .object({
          floorPrice: z.number().nullable().describe('Current floor price'),
          floorPriceSymbol: z.string().nullable().describe('Currency symbol for floor price'),
          totalVolume: z.number().nullable().describe('Total trading volume'),
          totalSales: z.number().nullable().describe('Total number of sales'),
          totalListings: z.number().nullable().describe('Total active listings'),
          numOwners: z.number().nullable().describe('Number of unique owners'),
          averagePrice: z.number().nullable().describe('Average sale price'),
          marketCap: z.number().nullable().describe('Market capitalization')
        })
        .nullable()
        .describe('Collection statistics (only included if includeStats is true)'),
      traits: z
        .record(z.string(), z.record(z.string(), z.number()))
        .nullable()
        .describe('Trait definitions with counts (only included if includeTraits is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let collectionData = await client.getCollection(ctx.input.collectionSlug);

    let stats: any = null;
    if (ctx.input.includeStats) {
      let statsData = await client.getCollectionStats(ctx.input.collectionSlug);
      let s = statsData.total ?? statsData;
      stats = {
        floorPrice: s.floor_price ?? null,
        floorPriceSymbol: s.floor_price_symbol ?? null,
        totalVolume: s.volume ?? null,
        totalSales: s.sales ?? null,
        totalListings: s.num_listings ?? null,
        numOwners: s.num_owners ?? null,
        averagePrice: s.average_price ?? null,
        marketCap: s.market_cap ?? null
      };
    }

    let traits: any = null;
    if (ctx.input.includeTraits) {
      let traitsData = await client.getCollectionTraits(ctx.input.collectionSlug);
      traits = traitsData.categories ?? traitsData;
    }

    let result = {
      collectionSlug: collectionData.collection ?? ctx.input.collectionSlug,
      name: collectionData.name ?? '',
      description: collectionData.description ?? null,
      imageUrl: collectionData.image_url ?? null,
      bannerImageUrl: collectionData.banner_image_url ?? null,
      owner: collectionData.owner ?? null,
      category: collectionData.category ?? null,
      safelistStatus:
        collectionData.safelist_request_status ?? collectionData.safelist_status ?? null,
      openseaUrl: collectionData.opensea_url ?? null,
      projectUrl: collectionData.project_url ?? null,
      discordUrl: collectionData.discord_url ?? null,
      twitterUsername: collectionData.twitter_username ?? null,
      contracts: (collectionData.contracts ?? []).map((c: any) => ({
        address: c.address,
        chain: c.chain
      })),
      totalSupply: collectionData.total_supply ?? null,
      traitOffersEnabled: collectionData.trait_offers_enabled ?? null,
      collectionOffersEnabled: collectionData.collection_offers_enabled ?? null,
      stats,
      traits
    };

    return {
      output: result,
      message: `Retrieved collection **${result.name}** (\`${result.collectionSlug}\`).${stats ? ` Floor price: ${stats.floorPrice ?? 'N/A'} ${stats.floorPriceSymbol ?? ''}, Total volume: ${stats.totalVolume ?? 'N/A'}.` : ''}`
    };
  })
  .build();
