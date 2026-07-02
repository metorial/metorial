import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let traitSchema = z
  .object({
    traitType: z.string().describe('The trait category name'),
    value: z.string().describe('The trait value'),
    displayType: z.string().nullable().describe('How the trait should be displayed')
  })
  .describe('An NFT trait');

let ownerSchema = z
  .object({
    address: z.string().describe('Owner wallet address'),
    quantity: z.number().describe('Number of copies owned')
  })
  .describe('An NFT owner');

export let getNft = SlateTool.create(spec, {
  name: 'Get NFT',
  key: 'get_nft',
  description: `Retrieve detailed metadata for a specific NFT including its name, description, image, traits, owners, rarity, and collection info. Use this to look up any individual NFT by its contract address and token identifier on a given blockchain.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chain: z
        .string()
        .optional()
        .describe(
          'Blockchain the NFT is on (e.g. ethereum, polygon, base). Defaults to config chain or ethereum.'
        ),
      contractAddress: z.string().describe('The smart contract address of the NFT'),
      tokenIdentifier: z.string().describe('The token ID of the NFT within the contract')
    })
  )
  .output(
    z.object({
      identifier: z.string().describe('Token ID of the NFT'),
      name: z.string().nullable().describe('Name of the NFT'),
      description: z.string().nullable().describe('Description of the NFT'),
      imageUrl: z.string().nullable().describe('URL of the NFT image'),
      animationUrl: z.string().nullable().describe('URL of the NFT animation, if any'),
      metadataUrl: z.string().nullable().describe('URL of the NFT metadata'),
      collection: z.string().describe('Collection slug the NFT belongs to'),
      contract: z.string().describe('Contract address'),
      tokenStandard: z.string().describe('Token standard (erc721, erc1155, etc.)'),
      owners: z.array(ownerSchema).describe('List of current owners'),
      traits: z.array(traitSchema).describe('List of NFT traits'),
      opensea_url: z.string().nullable().describe('URL to view the NFT on OpenSea')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let chain = ctx.input.chain || ctx.config.chain || 'ethereum';

    let data = await client.getNft(
      chain,
      ctx.input.contractAddress,
      ctx.input.tokenIdentifier
    );
    let nft = data.nft;

    let result = {
      identifier: nft.identifier,
      name: nft.name ?? null,
      description: nft.description ?? null,
      imageUrl: nft.image_url ?? null,
      animationUrl: nft.animation_url ?? null,
      metadataUrl: nft.metadata_url ?? null,
      collection: nft.collection ?? '',
      contract: nft.contract ?? ctx.input.contractAddress,
      tokenStandard: nft.token_standard ?? 'unknown',
      owners: (nft.owners ?? []).map((o: any) => ({
        address: o.address,
        quantity: o.quantity
      })),
      traits: (nft.traits ?? []).map((t: any) => ({
        traitType: t.trait_type,
        value: String(t.value),
        displayType: t.display_type ?? null
      })),
      opensea_url: nft.opensea_url ?? null
    };

    return {
      output: result,
      message: `Retrieved NFT **${result.name || result.identifier}** from collection \`${result.collection}\` on ${chain}. It has ${result.traits.length} traits and ${result.owners.length} owner(s).`
    };
  })
  .build();
