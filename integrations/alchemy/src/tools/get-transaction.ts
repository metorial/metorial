import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Look up a transaction by its hash and get its details and receipt. Returns transaction data including sender, receiver, value, gas info, status, and emitted logs.
Use this to inspect a specific transaction, verify its status, or analyze its effects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionHash: z.string().describe('The transaction hash to look up'),
      includeReceipt: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to also fetch the transaction receipt (status, logs, gas used)')
    })
  )
  .output(
    z.object({
      transactionHash: z.string().describe('The transaction hash'),
      from: z.string().optional().describe('Sender address'),
      to: z
        .string()
        .nullable()
        .optional()
        .describe('Receiver address (null for contract creation)'),
      value: z.string().optional().describe('Value transferred in hex wei'),
      gasPrice: z.string().optional().describe('Gas price in hex wei'),
      gas: z.string().optional().describe('Gas limit'),
      nonce: z.string().optional().describe('Transaction nonce'),
      blockNumber: z.string().optional().describe('Block number in hex'),
      blockHash: z.string().optional().describe('Block hash'),
      input: z.string().optional().describe('Transaction input data'),
      status: z
        .string()
        .optional()
        .describe('Transaction status (0x1 = success, 0x0 = failure)'),
      gasUsed: z.string().optional().describe('Actual gas used'),
      effectiveGasPrice: z.string().optional().describe('Effective gas price paid'),
      contractAddress: z
        .string()
        .nullable()
        .optional()
        .describe('Created contract address (for contract deployments)'),
      logsCount: z.number().optional().describe('Number of event logs emitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let tx = await client.getTransactionByHash(ctx.input.transactionHash);

    if (!tx) {
      return {
        output: {
          transactionHash: ctx.input.transactionHash
        },
        message: `Transaction \`${ctx.input.transactionHash}\` not found.`
      };
    }

    let receipt: any = null;
    if (ctx.input.includeReceipt) {
      try {
        receipt = await client.getTransactionReceipt(ctx.input.transactionHash);
      } catch {
        // Receipt may not be available for pending transactions
      }
    }

    let result = {
      transactionHash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gas: tx.gas,
      nonce: tx.nonce,
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash,
      input: tx.input,
      status: receipt?.status,
      gasUsed: receipt?.gasUsed,
      effectiveGasPrice: receipt?.effectiveGasPrice,
      contractAddress: receipt?.contractAddress,
      logsCount: receipt?.logs?.length
    };

    let status =
      receipt?.status === '0x1' ? 'Success' : receipt?.status === '0x0' ? 'Failed' : 'Pending';
    return {
      output: result,
      message: `Transaction \`${ctx.input.transactionHash.slice(0, 12)}...\` — **${status}**. From: \`${tx.from}\` → To: \`${tx.to || 'Contract Creation'}\`.${receipt ? ` Gas used: ${Number.parseInt(receipt.gasUsed, 16).toLocaleString()}.` : ''}`
    };
  })
  .build();
