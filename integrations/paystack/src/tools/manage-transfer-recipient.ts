import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import {
  exactId,
  observedFlag,
  optionalRecord,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const listOutput = z.object({
  recipients: z.array(
    z.object({
      exactRecipientId: z.string(),
      recipientCode: z.string(),
      name: z.string(),
      type: z.string(),
      currency: z.string(),
      active: z.boolean(),
      bankName: z.string().nullable(),
      accountNumber: z.string().nullable(),
      createdAt: z.string()
    })
  ),
  totalCount: z.number().optional(),
  currentPage: z.number().optional(),
  totalPages: z.number().optional(),
  nextCursor: z.string().nullable().optional(),
  previousCursor: z.string().nullable().optional(),
  perPage: z.number().optional()
});
export const listTransferRecipients = SlateTool.create(spec, {
  name: 'List Transfer Recipients',
  key: 'list_transfer_recipients',
  description:
    'List saved transfer beneficiaries and observed active states. Returns selected bank details and the provider continuation metadata; listing does not transfer funds.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      perPage: z.number().optional(),
      page: z.number().optional(),
      useCursor: z.boolean().optional().describe('Use cursor pagination; omit page when true'),
      next: z.string().optional(),
      previous: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional()
    })
  )
  .output(listOutput)
  .handleInvocation(async ctx => {
    const result = await new PaystackClient({ token: ctx.auth.token }).listTransferRecipients(
      ctx.input
    );
    return {
      output: validateOutput(listOutput, {
        recipients: records(result.data).map(item => ({
          exactRecipientId: exactId(item.id),
          recipientCode: item.recipient_code,
          name: item.name,
          type: item.type,
          currency: item.currency,
          active: observedFlag(item.active),
          bankName: optionalRecord(item.details).bank_name ?? null,
          accountNumber: optionalRecord(item.details).account_number ?? null,
          createdAt: item.created_at ?? item.createdAt
        })),
        ...pagination(result.meta)
      }),
      message: 'Retrieved the requested beneficiary page with observed continuation metadata.'
    };
  })
  .build();

const deleteOutput = z.object({
  recipientCode: z.string(),
  exactRecipientId: z.string(),
  active: z.literal(false),
  success: z.literal(true)
});
export const deleteTransferRecipient = SlateTool.create(spec, {
  name: 'Delete Transfer Recipient',
  key: 'delete_transfer_recipient',
  description:
    'Deactivate a saved transfer beneficiary and read back its inactive state. Paystack retains the recipient and transfer history; this operation does not erase financial records.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      recipientIdOrCode: z.string().describe('Exact recipient ID or recipient code')
    })
  )
  .output(deleteOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const before = record(
      (await client.getTransferRecipient(ctx.input.recipientIdOrCode)).data
    );
    const identifier = exactId(before.id);
    if (
      typeof before.recipient_code !== 'string' ||
      (identifier !== ctx.input.recipientIdOrCode &&
        before.recipient_code !== ctx.input.recipientIdOrCode)
    )
      throw createApiServiceError(
        'The fetched recipient does not match the requested ID or code; deactivation was not sent.',
        { reason: 'paystack.invalid_response' }
      );
    await client.deleteTransferRecipient(ctx.input.recipientIdOrCode);
    const after = record(
      (await client.getTransferRecipient(ctx.input.recipientIdOrCode)).data
    );
    if (
      exactId(after.id) !== identifier ||
      after.recipient_code !== before.recipient_code ||
      observedFlag(after.active) !== false
    )
      throw createApiServiceError(
        'Recipient deactivation was accepted but its inactive state could not be confirmed. Reconcile the recipient before retrying.',
        { reason: 'paystack.unconfirmed_mutation' }
      );
    return {
      output: validateOutput(deleteOutput, {
        recipientCode: after.recipient_code,
        exactRecipientId: identifier,
        active: false,
        success: true
      }),
      message: 'Recipient is inactive; its history remains.'
    };
  })
  .build();
