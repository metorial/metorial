import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import {
  optionalValue,
  providerInteger,
  readArray,
  readRecord,
  validateOutput
} from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
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
  transactionUrls: z
    .array(z.string())
    .optional()
    .describe('All block explorer URLs when the provider returns multiple links'),
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
  expireAtUtc: z.number().optional().describe('Expiration timestamp (UTC)'),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = readRecord(await client.getOperation(ctx.input.operationId));

    let transactions =
      result.tx === undefined || result.tx === null
        ? undefined
        : readArray(result.tx).map(tx => ({
            txId: optionalValue(tx.txid),
            value: optionalValue(tx.value),
            block: providerInteger(tx.block),
            processed: optionalValue(tx.processed)
          }));

    return {
      output: validateOutput(outputSchema, {
        operationId: result.id,
        type: result.type,
        status: optionalValue(result.status),
        currency: result.currency ?? result.psys_cid,
        amount: optionalValue(result.amount),
        pendingSum:
          typeof result.pending_sum === 'number' && Number.isSafeInteger(result.pending_sum)
            ? String(result.pending_sum)
            : optionalValue(result.pending_sum),
        fee: optionalValue(result.fee),
        walletHash: optionalValue(result.wallet_hash),
        sendMany: optionalValue(result.sendmany),
        sourceCurrency: optionalValue(result.source_currency),
        sourceRate: optionalValue(result.source_rate),
        confirmations: providerInteger(result.confirmations),
        txUrl: typeof result.tx_url === 'string' ? result.tx_url : undefined,
        transactionUrls: Array.isArray(result.tx_url) ? result.tx_url : undefined,
        transactions,
        createdAtUtc: optionalValue(result.created_at_utc),
        finishedAtUtc: optionalValue(result.finished_at_utc),
        expireAtUtc: optionalValue(result.expire_at_utc),
        raw: result
      }),
      message: client.redact(
        `Operation \`${result.id}\` — **${result.type}** — Status: **${result.status}** — ${result.amount ?? '?'} ${result.currency || result.psys_cid || ''}`
      )
    };
  })
  .build();
