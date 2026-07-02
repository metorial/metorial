import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let getTransferTool = SlateTool.create(spec, {
  name: 'Get Transfer',
  key: 'get_transfer',
  description: `Retrieve the current status and details of a bank transfer by its ID. Returns the transfer amount, type, status, network, and creation timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transferId: z.string().describe('Transfer ID to look up')
    })
  )
  .output(
    z.object({
      transferId: z.string().describe('Transfer ID'),
      authorizationId: z.string().describe('Authorization ID'),
      accountId: z.string().describe('Account ID'),
      status: z
        .string()
        .describe(
          'Transfer status: pending, posted, settled, funds_available, cancelled, failed, returned'
        ),
      type: z.string().describe('Transfer type: debit or credit'),
      amount: z.string().describe('Transfer amount'),
      description: z.string().describe('Transfer description'),
      network: z.string().optional().describe('Transfer network'),
      created: z.string().describe('ISO 8601 creation timestamp'),
      cancellable: z.boolean().describe('Whether the transfer can be cancelled'),
      failureReason: z
        .any()
        .nullable()
        .optional()
        .describe('Failure reason if failed or returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getTransfer(ctx.input.transferId);
    let transfer = result.transfer;

    return {
      output: {
        transferId: transfer.id,
        authorizationId: transfer.authorization_id,
        accountId: transfer.account_id,
        status: transfer.status,
        type: transfer.type,
        amount: transfer.amount,
        description: transfer.description,
        network: transfer.network,
        created: transfer.created,
        cancellable: transfer.cancellable,
        failureReason: transfer.failure_reason ?? null
      },
      message: `Transfer \`${transfer.id}\` — **${transfer.type}** $${transfer.amount} — status: **${transfer.status}**.`
    };
  })
  .build();
