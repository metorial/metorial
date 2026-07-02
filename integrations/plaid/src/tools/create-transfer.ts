import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let createTransferTool = SlateTool.create(spec, {
  name: 'Create Transfer',
  key: 'create_transfer',
  description: `Initiate a bank transfer (ACH debit or credit). Requires a prior transfer authorization. The transfer is idempotent — if a transfer with the same authorization ID exists, the existing transfer is returned. Returns the transfer details including status and expected settlement date.`,
  instructions: [
    'You must first create a transfer authorization before creating a transfer.',
    'Amount should be a decimal string, e.g. "10.00".',
    'Description is limited to 15 characters for RTP or 10 characters for ACH.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      accountId: z.string().describe('Account ID to transfer from/to'),
      authorizationId: z
        .string()
        .describe('Transfer authorization ID from a previous authorization call'),
      amount: z.string().describe('Transfer amount as a decimal string (e.g. "12.34")'),
      description: z
        .string()
        .describe('Short transfer description (max 10-15 chars depending on network)'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach to the transfer')
    })
  )
  .output(
    z.object({
      transferId: z.string().describe('Created transfer ID'),
      authorizationId: z.string().describe('Authorization ID used'),
      status: z
        .string()
        .describe('Transfer status: pending, posted, settled, cancelled, failed, returned'),
      type: z.string().describe('Transfer type: debit or credit'),
      amount: z.string().describe('Transfer amount'),
      network: z
        .string()
        .optional()
        .describe('Transfer network: ach, same-day-ach, rtp, wire'),
      created: z.string().describe('ISO 8601 creation timestamp'),
      cancellable: z.boolean().describe('Whether the transfer can still be cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.createTransfer({
      accessToken: ctx.input.accessToken,
      accountId: ctx.input.accountId,
      authorizationId: ctx.input.authorizationId,
      amount: ctx.input.amount,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });

    let transfer = result.transfer;

    return {
      output: {
        transferId: transfer.id,
        authorizationId: transfer.authorization_id,
        status: transfer.status,
        type: transfer.type,
        amount: transfer.amount,
        network: transfer.network,
        created: transfer.created,
        cancellable: transfer.cancellable
      },
      message: `Created **${transfer.type}** transfer \`${transfer.id}\` for **$${transfer.amount}** — status: **${transfer.status}**.`
    };
  })
  .build();
