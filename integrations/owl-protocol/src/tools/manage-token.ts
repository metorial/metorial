import { SlateTool } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

export let getToken = SlateTool.create(spec, {
  name: 'Get Token',
  key: 'get_token',
  description: `Retrieve details and metadata for a specific ERC721 token from a collection.
Returns the token's on-chain data and associated metadata (name, description, image, attributes).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chainId: z.number().describe('Chain ID where the collection is deployed'),
      contractAddress: z.string().describe('Contract address of the collection'),
      tokenId: z.string().describe('ID of the token to retrieve')
    })
  )
  .output(
    z.object({
      chainId: z.number().optional().describe('Chain ID'),
      contractAddress: z.string().optional().describe('Contract address'),
      tokenId: z.string().optional().describe('Token ID'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Token metadata including name, description, image, and attributes'),
      owner: z.string().optional().describe('Token owner address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let chainId = ctx.input.chainId ?? ctx.config.chainId;
    if (!chainId) {
      throw new Error('chainId is required.');
    }

    let result = await client.getProjectToken({
      chainId,
      contractAddress: ctx.input.contractAddress,
      tokenId: ctx.input.tokenId
    });

    return {
      output: {
        chainId: result.chainId ?? chainId,
        contractAddress: result.address ?? ctx.input.contractAddress,
        tokenId: result.tokenId ?? ctx.input.tokenId,
        metadata: result.metadata,
        owner: result.owner
      },
      message: `Retrieved token **#${ctx.input.tokenId}** from collection \`${ctx.input.contractAddress}\` on chain ${chainId}.`
    };
  })
  .build();

export let updateToken = SlateTool.create(spec, {
  name: 'Update Token Metadata',
  key: 'update_token',
  description: `Update the metadata of an existing ERC721 token. Modifies specified fields while keeping other previously defined fields intact.
Use this to change a token's name, description, image, or attributes after minting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chainId: z.number().describe('Chain ID where the collection is deployed'),
      contractAddress: z.string().describe('Contract address of the collection'),
      tokenId: z.string().describe('ID of the token to update'),
      metadata: z
        .object({
          name: z.string().optional().describe('Updated token name'),
          description: z.string().optional().describe('Updated token description'),
          image: z.string().optional().describe('Updated token image URL'),
          attributes: z
            .array(
              z.object({
                trait_type: z.string().describe('Attribute name'),
                value: z.string().describe('Attribute value')
              })
            )
            .optional()
            .describe('Updated token attributes')
        })
        .describe('Metadata fields to update')
    })
  )
  .output(
    z.object({
      chainId: z.number().optional().describe('Chain ID'),
      contractAddress: z.string().optional().describe('Contract address'),
      tokenId: z.string().optional().describe('Token ID'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Updated token metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let chainId = ctx.input.chainId ?? ctx.config.chainId;
    if (!chainId) {
      throw new Error('chainId is required.');
    }

    ctx.info({
      message: 'Updating token metadata',
      contractAddress: ctx.input.contractAddress,
      tokenId: ctx.input.tokenId
    });

    let result = await client.patchProjectToken({
      chainId,
      contractAddress: ctx.input.contractAddress,
      tokenId: ctx.input.tokenId,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        chainId: result.chainId ?? chainId,
        contractAddress: result.address ?? ctx.input.contractAddress,
        tokenId: result.tokenId ?? ctx.input.tokenId,
        metadata: result.metadata
      },
      message: `Updated metadata for token **#${ctx.input.tokenId}** in collection \`${ctx.input.contractAddress}\`.`
    };
  })
  .build();
