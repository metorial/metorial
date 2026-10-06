import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient, safePlaidError } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export const cancelTransferTool = SlateTool.create(spec, {
  name: 'Cancel Transfer',
  key: 'cancel_transfer',
  description:
    'Request cancellation of a cancellable transfer, then read its actual current state. Transfers submitted to a payment network may already be ineligible; a cancellation acknowledgment is not proof of settlement reversal.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      transferId: z
        .string()
        .describe('Transfer identity explicitly authorized for cancellation')
    })
  )
  .output(
    z.object({
      transferId: z.string(),
      status: z.string(),
      cancellable: z.boolean(),
      cancelled: z.boolean().describe('Whether the independent readback reports cancelled'),
      cancellationRequested: z
        .boolean()
        .describe('Whether this invocation submitted cancellation'),
      requestId: z
        .string()
        .describe('Provider cancellation receipt, or lookup receipt if already cancelled')
    })
  )
  .handleInvocation(async ctx => {
    const client = new PlaidClient({ ...ctx.auth, environment: ctx.config.environment });
    const before = await client.getTransfer(ctx.input.transferId);
    if (before.transfer.status === 'cancelled')
      return {
        output: {
          transferId: before.transfer.id,
          status: before.transfer.status,
          cancellable: before.transfer.cancellable,
          cancelled: true,
          cancellationRequested: false,
          requestId: before.request_id
        },
        message: 'The transfer already reports cancelled.'
      };
    if (!before.transfer.cancellable)
      invalid('The transfer is not currently cancellable. No cancellation was submitted.');
    const receipt = await client.cancelTransfer(ctx.input.transferId);
    let after: Awaited<ReturnType<PlaidClient['getTransfer']>>;
    try {
      after = await client.getTransfer(ctx.input.transferId);
    } catch (error) {
      throw safePlaidError(error, '/transfer/cancel/readback', [
        ctx.auth.clientId,
        ctx.auth.secret
      ]);
    }
    return {
      output: {
        transferId: after.transfer.id,
        status: after.transfer.status,
        cancellable: after.transfer.cancellable,
        cancelled: after.transfer.status === 'cancelled',
        cancellationRequested: true,
        requestId: receipt.request_id
      },
      message: `Cancellation was acknowledged; current transfer status: ${after.transfer.status}.`
    };
  })
  .build();
