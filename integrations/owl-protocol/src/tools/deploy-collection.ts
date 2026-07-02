import { SlateTool } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

export let deployCollection = SlateTool.create(spec, {
  name: 'Deploy Collection',
  key: 'deploy_collection',
  description: `Deploy a new ERC721 NFT collection (smart contract) on an EVM-compatible blockchain.
Supports configuring royalties, metadata base URI, and contract images.
Returns the deployed contract address and transaction details.`,
  instructions: [
    'The chainId must match the chain configured for your Owl Protocol project.',
    'The symbol should be 3-4 characters (e.g. "MYC", "NFT").',
    'Royalty fee is in basis points: 500 = 5%, 1000 = 10%.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chainId: z
        .number()
        .describe('Blockchain network chain ID to deploy on (e.g. 150150 for Owl testnet)'),
      name: z.string().describe('Name of the collection'),
      symbol: z.string().describe('Ticker symbol of the collection (3-4 characters)'),
      baseUri: z
        .string()
        .optional()
        .describe(
          'Base URI for token metadata. Defaults to the Owl Protocol hosted endpoint.'
        ),
      royaltyReceiver: z
        .string()
        .optional()
        .describe('ERC2981 royalty receiver address. Defaults to your smart account address.'),
      feeNumerator: z
        .string()
        .optional()
        .describe(
          'ERC2981 royalty amount in basis points (e.g. "500" for 5%). Defaults to 500.'
        ),
      contractImage: z
        .string()
        .optional()
        .describe('Base64-encoded image for the contract metadata'),
      contractImageSuffix: z
        .string()
        .optional()
        .describe('File extension of the contract image (e.g. "png", "jpg")')
    })
  )
  .output(
    z.object({
      contractAddress: z.string().describe('Deployed contract address'),
      name: z.string().optional().describe('Collection name'),
      symbol: z.string().optional().describe('Collection symbol'),
      baseUri: z.string().optional().describe('Token metadata base URI'),
      royaltyReceiver: z.string().optional().describe('Royalty receiver address'),
      feeNumerator: z.string().optional().describe('Royalty fee in basis points'),
      userOpHash: z.string().optional().describe('Transaction hash for the deployment'),
      contractUri: z.string().optional().describe('Contract metadata URI'),
      deployParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional deployment parameters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let chainId = ctx.input.chainId ?? ctx.config.chainId;
    if (!chainId) {
      throw new Error(
        'chainId is required. Provide it in the input or set a default in the configuration.'
      );
    }

    ctx.info({
      message: 'Deploying collection',
      name: ctx.input.name,
      symbol: ctx.input.symbol,
      chainId
    });

    let result = await client.deployCollection({
      chainId,
      name: ctx.input.name,
      symbol: ctx.input.symbol,
      baseUri: ctx.input.baseUri,
      royaltyReceiver: ctx.input.royaltyReceiver,
      feeNumerator: ctx.input.feeNumerator,
      contractImage: ctx.input.contractImage,
      contractImageSuffix: ctx.input.contractImageSuffix
    });

    return {
      output: {
        contractAddress: result.contractAddress,
        name: result.name,
        symbol: result.symbol,
        baseUri: result.baseUri,
        royaltyReceiver: result.royaltyReceiver,
        feeNumerator: result.feeNumerator,
        userOpHash: result.userOpHash,
        contractUri: result.contractUri,
        deployParams: result.deployParams
      },
      message: `Deployed collection **${ctx.input.name}** (${ctx.input.symbol}) on chain ${chainId}. Contract address: \`${result.contractAddress}\``
    };
  })
  .build();
