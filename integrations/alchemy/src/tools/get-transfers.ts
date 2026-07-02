import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getTransfers = SlateTool.create(spec, {
  name: 'Get Transfers',
  key: 'get_transfers',
  description: `Fetch historical token transfers and transactions for any address. Supports filtering by sender, receiver, transfer type (external, internal, ERC-20, ERC-721, ERC-1155), block range, and more.
Use this to look up transaction history, track asset movements, or audit token flows for a wallet or between addresses.`,
  instructions: [
    'Provide at least one of fromAddress or toAddress to filter transfers.',
    'Categories must include at least one of: external, internal, erc20, erc721, erc1155, specialnft.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromAddress: z.string().optional().describe('Sender address to filter by'),
      toAddress: z.string().optional().describe('Receiver address to filter by'),
      category: z
        .array(z.enum(['external', 'internal', 'erc20', 'erc721', 'erc1155', 'specialnft']))
        .default(['external', 'internal', 'erc20', 'erc721', 'erc1155'])
        .describe('Transfer types to include'),
      fromBlock: z
        .string()
        .optional()
        .describe('Start block in hex (e.g., "0x0") or "latest"'),
      toBlock: z.string().optional().describe('End block in hex or "latest"'),
      contractAddresses: z
        .array(z.string())
        .optional()
        .describe('Filter to specific contract addresses'),
      maxCount: z
        .string()
        .optional()
        .describe('Max number of results to return in hex (e.g., "0x3e8" for 1000)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by block number'),
      withMetadata: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include block metadata (timestamp) with results'),
      excludeZeroValue: z
        .boolean()
        .optional()
        .default(true)
        .describe('Exclude zero-value transfers'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page')
    })
  )
  .output(
    z.object({
      transfers: z
        .array(
          z.object({
            from: z.string().describe('Sender address'),
            to: z.string().nullable().describe('Receiver address'),
            value: z.number().nullable().describe('Transfer value'),
            asset: z.string().nullable().describe('Asset name (e.g., ETH, USDC)'),
            category: z.string().describe('Transfer type'),
            blockNum: z.string().describe('Block number in hex'),
            transactionHash: z.string().describe('Transaction hash'),
            tokenId: z.string().nullable().optional().describe('Token ID for NFT transfers'),
            rawContract: z
              .object({
                address: z.string().nullable().optional().describe('Contract address'),
                value: z.string().nullable().optional().describe('Raw value in hex'),
                decimal: z.string().nullable().optional().describe('Token decimals')
              })
              .optional()
              .describe('Raw contract details'),
            metadata: z
              .object({
                blockTimestamp: z.string().optional().describe('Block timestamp')
              })
              .optional()
              .describe('Block metadata')
          })
        )
        .describe('List of transfers'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let result = await client.getAssetTransfers({
      fromAddress: ctx.input.fromAddress,
      toAddress: ctx.input.toAddress,
      category: ctx.input.category,
      fromBlock: ctx.input.fromBlock,
      toBlock: ctx.input.toBlock,
      contractAddresses: ctx.input.contractAddresses,
      maxCount: ctx.input.maxCount,
      order: ctx.input.order,
      withMetadata: ctx.input.withMetadata,
      excludeZeroValue: ctx.input.excludeZeroValue,
      pageKey: ctx.input.pageKey
    });

    let transfers = (result.transfers || []).map((t: any) => ({
      from: t.from,
      to: t.to,
      value: t.value,
      asset: t.asset,
      category: t.category,
      blockNum: t.blockNum,
      transactionHash: t.hash || t.uniqueId,
      tokenId: t.tokenId || null,
      rawContract: t.rawContract
        ? {
            address: t.rawContract.address,
            value: t.rawContract.value,
            decimal: t.rawContract.decimal
          }
        : undefined,
      metadata: t.metadata
        ? {
            blockTimestamp: t.metadata.blockTimestamp
          }
        : undefined
    }));

    let address = ctx.input.fromAddress || ctx.input.toAddress || 'specified address';
    return {
      output: {
        transfers,
        pageKey: result.pageKey || undefined
      },
      message: `Found **${transfers.length}** transfer(s) for \`${address}\`. Categories: ${ctx.input.category.join(', ')}.${result.pageKey ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
