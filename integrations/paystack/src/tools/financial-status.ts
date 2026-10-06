import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { exactId, optionalRecord, record, records, validateOutput } from '../lib/transport';
import { spec } from '../spec';

const balanceOutput = z.object({
  balances: z.array(
    z.object({
      currency: z.string(),
      balance: z
        .number()
        .int()
        .nonnegative()
        .safe()
        .describe('Available balance in currency subunits')
    })
  )
});
export const getBalance = SlateTool.create(spec, {
  name: 'Get Balance',
  key: 'get_balance',
  description:
    'Read the available transfer balance for each returned currency. Does not reserve funds or initiate a transfer.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(balanceOutput)
  .handleInvocation(async ctx => {
    const result = await new PaystackClient({ token: ctx.auth.token }).getBalance();
    return {
      output: validateOutput(balanceOutput, {
        balances: records(result.data).map(item => ({
          currency: item.currency,
          balance: item.balance
        }))
      }),
      message: 'Retrieved available balances.'
    };
  })
  .build();

const transferOutput = z.object({
  exactTransferId: z.string(),
  transferCode: z.string(),
  reference: z.string(),
  amount: z.number().int().nonnegative().safe(),
  currency: z.string(),
  status: z.string(),
  recipientCode: z.string().optional(),
  exactRecipientId: z.string().optional()
});
export const verifyTransfer = SlateTool.create(spec, {
  name: 'Verify Transfer',
  key: 'verify_transfer',
  description:
    'Read a transfer by its reference and return the observed provider status. Pending or OTP status is not delivery confirmation; test-mode success does not move real money.',
  tags: { readOnly: true }
})
  .input(z.object({ reference: z.string().describe('Transfer reference to verify') }))
  .output(transferOutput)
  .handleInvocation(async ctx => {
    const transfer = record(
      (await new PaystackClient({ token: ctx.auth.token }).verifyTransfer(ctx.input.reference))
        .data
    );
    const recipient = optionalRecord(transfer.recipient);
    return {
      output: validateOutput(transferOutput, {
        exactTransferId: exactId(transfer.id),
        transferCode: transfer.transfer_code,
        reference: transfer.reference,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        recipientCode: recipient.recipient_code,
        exactRecipientId:
          transfer.recipient === undefined
            ? undefined
            : exactId(recipient.id ?? transfer.recipient)
      }),
      message: 'Retrieved the transfer’s observed status.'
    };
  })
  .build();

const archiveOutput = z.object({
  requestCode: z.string(),
  exactRequestId: z.string(),
  archived: z.literal(true),
  success: z.literal(true)
});
export const archivePaymentRequest = SlateTool.create(spec, {
  name: 'Archive Payment Request',
  key: 'archive_payment_request',
  description:
    'Archive a payment request and read back its archived flag. The request disappears from normal list and verification results; financial history is retained.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ requestCode: z.string().describe('Payment request code to archive') }))
  .output(archiveOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const before = record((await client.getPaymentRequest(ctx.input.requestCode)).data);
    if (before.request_code !== ctx.input.requestCode)
      throw createApiServiceError(
        'The fetched payment request does not match the requested code.',
        { reason: 'paystack.invalid_response' }
      );
    const identifier = exactId(before.id);
    await client.archivePaymentRequest(ctx.input.requestCode);
    const after = record((await client.getPaymentRequest(ctx.input.requestCode)).data);
    if (
      after.request_code !== ctx.input.requestCode ||
      exactId(after.id) !== identifier ||
      after.archived !== true
    )
      throw createApiServiceError(
        'Archive was accepted but the request’s archived flag could not be confirmed. Reconcile before retrying.',
        { reason: 'paystack.unconfirmed_mutation' }
      );
    return {
      output: validateOutput(archiveOutput, {
        requestCode: after.request_code,
        exactRequestId: identifier,
        archived: true,
        success: true
      }),
      message: 'Payment request is archived; history remains.'
    };
  })
  .build();
