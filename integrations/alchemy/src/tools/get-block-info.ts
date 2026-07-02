import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getBlockInfo = SlateTool.create(spec, {
  name: 'Get Block Info',
  key: 'get_block_info',
  description: `Retrieve information about a specific block by number or hash, or get the latest block number. Returns block details including timestamp, transactions, gas usage, and miner information.
Use this to inspect block data, check the current chain head, or retrieve block metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      blockNumber: z
        .string()
        .optional()
        .describe(
          'Block number in hex (e.g., "0x10d4f") or tag ("latest", "earliest", "pending"). If omitted, returns the latest block number only.'
        ),
      blockHash: z
        .string()
        .optional()
        .describe(
          'Block hash to look up. Takes precedence over blockNumber if both are provided.'
        ),
      includeTransactions: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include full transaction objects in the response')
    })
  )
  .output(
    z.object({
      latestBlockNumber: z
        .string()
        .optional()
        .describe('Latest block number in hex (returned when no specific block is requested)'),
      block: z
        .object({
          blockNumber: z.string().optional().describe('Block number in hex'),
          blockHash: z.string().optional().describe('Block hash'),
          timestamp: z.string().optional().describe('Block timestamp in hex'),
          miner: z.string().optional().describe('Miner/validator address'),
          gasUsed: z.string().optional().describe('Gas used in hex'),
          gasLimit: z.string().optional().describe('Gas limit in hex'),
          baseFeePerGas: z.string().optional().describe('Base fee per gas in hex'),
          transactionCount: z
            .number()
            .optional()
            .describe('Number of transactions in the block'),
          parentHash: z.string().optional().describe('Parent block hash'),
          transactions: z.array(z.any()).optional().describe('Transactions in the block')
        })
        .optional()
        .describe('Block details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    // If no specific block requested, just return latest block number
    if (!ctx.input.blockNumber && !ctx.input.blockHash) {
      let latestBlockNumber = await client.getBlockNumber();
      return {
        output: { latestBlockNumber },
        message: `Current block number: **${Number.parseInt(latestBlockNumber, 16)}** (\`${latestBlockNumber}\`).`
      };
    }

    let blockData: any;
    if (ctx.input.blockHash) {
      blockData = await client.getBlockByHash(
        ctx.input.blockHash,
        ctx.input.includeTransactions
      );
    } else if (ctx.input.blockNumber) {
      blockData = await client.getBlockByNumber(
        ctx.input.blockNumber,
        ctx.input.includeTransactions
      );
    }

    if (!blockData) {
      return {
        output: {},
        message: 'Block not found.'
      };
    }

    let block = {
      blockNumber: blockData.number,
      blockHash: blockData.hash,
      timestamp: blockData.timestamp,
      miner: blockData.miner,
      gasUsed: blockData.gasUsed,
      gasLimit: blockData.gasLimit,
      baseFeePerGas: blockData.baseFeePerGas,
      transactionCount: blockData.transactions?.length,
      parentHash: blockData.parentHash,
      transactions: ctx.input.includeTransactions ? blockData.transactions : undefined
    };

    let blockNum = blockData.number ? Number.parseInt(blockData.number, 16) : 'unknown';
    return {
      output: { block },
      message: `Block **#${blockNum}** — ${block.transactionCount ?? 0} transaction(s), gas used: ${blockData.gasUsed ? Number.parseInt(blockData.gasUsed, 16).toLocaleString() : 'N/A'}.`
    };
  })
  .build();
