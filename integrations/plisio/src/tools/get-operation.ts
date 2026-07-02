import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let getOperation = SlateTool.create(spec, {
  name: 'Get Operation',
  key: 'get_operation',
  description: `Retrieve detailed information about a specific transaction by its operation ID. Returns full details including status, amounts, fees, confirmations, blockchain transaction hashes, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      operationId: z.string().describe('Plisio operation/transaction ID')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      type: z.string().describe('Operation type (cash_in, cash_out, mass_cash_out, invoice)'),
      status: z.string().describe('Current status'),
      currency: z.string().optional().describe('Cryptocurrency code'),
      amount: z.string().optional().describe('Operation amount'),
      pendingSum: z.string().optional().describe('Pending unconfirmed amount'),
      fee: z.string().optional().describe('Transaction fee'),
      walletHash: z.string().optional().describe('Wallet address'),
      sendMany: z
        .record(z.string(), z.string())
        .optional()
        .describe('Address-to-amount mapping (mass withdrawal)'),
      sourceCurrency: z.string().optional().describe('Fiat currency code'),
      sourceRate: z.string().optional().describe('Exchange rate'),
      confirmations: z.number().optional().describe('Number of blockchain confirmations'),
      txUrl: z.string().optional().describe('Block explorer URL'),
      transactions: z
        .array(
          z.object({
            txId: z.string().optional().describe('Blockchain transaction hash'),
            value: z.string().optional().describe('Transaction value'),
            block: z.number().optional().describe('Block number'),
            processed: z.boolean().optional().describe('Whether the transaction is processed')
          })
        )
        .optional()
        .describe('Individual blockchain transactions'),
      createdAtUtc: z.number().optional().describe('Creation timestamp (UTC)'),
      finishedAtUtc: z.number().optional().describe('Completion timestamp (UTC)'),
      expireAtUtc: z.number().optional().describe('Expiration timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.getOperation(ctx.input.operationId);

    let transactions = (result.tx || []).map((tx: any) => ({
      txId: tx.txid,
      value: tx.value,
      block: tx.block,
      processed: tx.processed
    }));

    return {
      output: {
        operationId: result.id,
        type: result.type,
        status: result.status,
        currency: result.currency ?? result.psys_cid,
        amount: result.amount,
        pendingSum: result.pending_sum,
        fee: result.fee,
        walletHash: result.wallet_hash,
        sendMany: result.sendmany,
        sourceCurrency: result.source_currency,
        sourceRate: result.source_rate,
        confirmations: result.confirmations,
        txUrl: result.tx_url,
        transactions,
        createdAtUtc: result.created_at_utc,
        finishedAtUtc: result.finished_at_utc,
        expireAtUtc: result.expire_at_utc
      },
      message: `Operation \`${result.id}\` — **${result.type}** — Status: **${result.status}** — ${result.amount ?? '?'} ${result.currency || result.psys_cid || ''}`
    };
  })
  .build();
