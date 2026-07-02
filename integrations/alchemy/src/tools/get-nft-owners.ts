import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getNFTOwners = SlateTool.create(spec, {
  name: 'Get NFT Owners',
  key: 'get_nft_owners',
  description: `Look up owners of a specific NFT token or all owners of an NFT contract/collection. Can also check spam classification and fetch NFT sales history.
Use this to verify NFT ownership, analyze holder distribution, or check recent sales.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contractAddress: z.string().describe('NFT contract address'),
      tokenId: z
        .string()
        .optional()
        .describe(
          'Specific token ID. If provided, returns owners of that token. If omitted, returns all owners of the contract.'
        ),
      withTokenBalances: z
        .boolean()
        .optional()
        .describe('Include token balance counts per owner (only for contract-level queries)'),
      checkSpam: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also check if the contract is classified as spam'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page')
    })
  )
  .output(
    z.object({
      owners: z
        .array(
          z.object({
            ownerAddress: z.string().describe('Owner wallet address'),
            tokenBalances: z
              .array(
                z.object({
                  tokenId: z.string().describe('Token ID'),
                  balance: z.number().describe('Number of tokens held')
                })
              )
              .optional()
              .describe('Token balances per owner')
          })
        )
        .describe('List of owners'),
      isSpam: z.boolean().optional().describe('Whether the contract is classified as spam'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let isSpam: boolean | undefined;
    if (ctx.input.checkSpam) {
      try {
        let spamResult = await client.isSpamContract(ctx.input.contractAddress);
        isSpam = spamResult === true || spamResult?.isSpamContract === true;
      } catch {
        // Spam check may not be available for all networks
      }
    }

    if (ctx.input.tokenId) {
      let result = await client.getOwnersForNFT(
        ctx.input.contractAddress,
        ctx.input.tokenId,
        ctx.input.pageKey
      );
      let owners = (result.owners || []).map((addr: string) => ({
        ownerAddress: addr
      }));

      return {
        output: {
          owners,
          isSpam,
          pageKey: result.pageKey || undefined
        },
        message: `Found **${owners.length}** owner(s) for NFT \`${ctx.input.contractAddress.slice(0, 10)}...\` token #${ctx.input.tokenId}.${isSpam !== undefined ? ` Spam: ${isSpam}.` : ''}`
      };
    }

    let result = await client.getOwnersForContract(
      ctx.input.contractAddress,
      ctx.input.withTokenBalances,
      ctx.input.pageKey
    );
    let owners = (result.ownerAddresses || result.owners || []).map((entry: any) => {
      if (typeof entry === 'string') {
        return { ownerAddress: entry };
      }
      return {
        ownerAddress: entry.ownerAddress,
        tokenBalances: entry.tokenBalances?.map((tb: any) => ({
          tokenId: tb.tokenId,
          balance: tb.balance
        }))
      };
    });

    return {
      output: {
        owners,
        isSpam,
        pageKey: result.pageKey || undefined
      },
      message: `Found **${owners.length}** owner(s) for contract \`${ctx.input.contractAddress.slice(0, 10)}...\`.${isSpam !== undefined ? ` Spam: ${isSpam}.` : ''}${result.pageKey ? ' More results available.' : ''}`
    };
  })
  .build();
