import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let getTransactions = SlateTool.create(spec, {
  name: 'Get Transactions',
  key: 'get_transactions',
  description: `Retrieve transaction details from your Starton project. Get a specific transaction by ID or list recent transactions with optional network filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().optional().describe('Specific transaction ID to retrieve'),
      network: z.string().optional().describe('Filter transactions by blockchain network'),
      limit: z.number().default(20).describe('Number of transactions to return'),
      page: z.number().default(0).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      transactions: z
        .array(
          z.object({
            transactionId: z.string().describe('Starton transaction identifier'),
            transactionHash: z.string().optional().describe('On-chain transaction hash'),
            network: z.string().optional().describe('Blockchain network'),
            state: z
              .string()
              .optional()
              .describe('Transaction state (e.g., mined, pending, error)'),
            from: z.string().optional().describe('Sender address'),
            to: z.string().optional().describe('Recipient address'),
            value: z.string().optional().describe('Transaction value'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('Transaction details'),
      totalCount: z.number().optional().describe('Total number of transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    if (ctx.input.transactionId) {
      let tx = await client.getTransaction(ctx.input.transactionId);

      return {
        output: {
          transactions: [
            {
              transactionId: tx.id || ctx.input.transactionId,
              transactionHash: tx.transactionHash,
              network: tx.network,
              state: tx.state,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              createdAt: tx.createdAt
            }
          ],
          totalCount: 1
        },
        message: `Transaction \`${tx.transactionHash || ctx.input.transactionId}\` is **${tx.state}** on ${tx.network}.`
      };
    }

    let result = await client.listTransactions({
      limit: ctx.input.limit,
      page: ctx.input.page,
      network: ctx.input.network
    });

    let items = result.items || result || [];

    return {
      output: {
        transactions: items.map((tx: any) => ({
          transactionId: tx.id || '',
          transactionHash: tx.transactionHash,
          network: tx.network,
          state: tx.state,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          createdAt: tx.createdAt
        })),
        totalCount: result.meta?.totalCount || items.length
      },
      message: `Found **${items.length}** transactions${ctx.input.network ? ` on ${ctx.input.network}` : ''}.`
    };
  })
  .build();
