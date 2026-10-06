import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { isProviderIdentifier } from '../lib/mapping';
import {
  exactId,
  observedFlag,
  optionalNumericId,
  optionalRecord,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const initiateTransferOutput = z.object({
  transferCode: z.string().describe('Transfer code'),
  reference: z.string().describe('Transfer reference'),
  amount: z.number().describe('Transfer amount'),
  currency: z.string().describe('Currency'),
  status: z.string().describe('Transfer status')
});

export let initiateTransfer = SlateTool.create(spec, {
  name: 'Initiate Transfer',
  key: 'initiate_transfer',
  description: `Send money to a bank account or mobile money number. You must first create a transfer recipient, then use their recipient code here. The source is always "balance".
Amounts are in the **smallest currency unit**.`,
  instructions: [
    'Create a transfer recipient first using the Create Transfer Recipient tool.',
    'The source parameter should always be "balance".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.number().describe('Amount in smallest currency unit'),
      recipientCode: z
        .string()
        .describe('Recipient code (from creating a transfer recipient)'),
      reason: z.string().optional().describe('Reason for the transfer'),
      currency: z.string().optional().describe('Currency code'),
      reference: z
        .string()
        .optional()
        .describe('Unique transfer reference. Auto-generated if not provided')
    })
  )
  .output(initiateTransferOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.initiateTransfer({
      source: 'balance',
      amount: ctx.input.amount,
      recipient: ctx.input.recipientCode,
      reason: ctx.input.reason,
      currency: ctx.input.currency,
      reference: ctx.input.reference
    });
    const transfer = record(result.data);
    const output = {
      transferCode: transfer.transfer_code,
      reference: transfer.reference,
      amount: transfer.amount,
      currency: transfer.currency,
      status: transfer.status
    };
    return {
      output: validateOutput(initiateTransferOutput, output),
      message:
        'Transfer initiation accepted; status may be pending or require OTP. Verify before retrying.'
    };
  })
  .build();
const createTransferRecipientOutput = z.object({
  recipientCode: z.string().describe('Recipient code for initiating transfers'),
  recipientId: z.number().optional().describe('Recipient ID'),
  exactRecipientId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  name: z.string().describe('Recipient name'),
  authorizationCode: z
    .string()
    .optional()
    .describe('Reusable authorization code; required for authorization recipients'),
  email: z
    .string()
    .optional()
    .describe(
      'Email bound to the reusable authorization; required for authorization recipients'
    ),
  type: z.string().describe('Recipient type'),
  bankName: z.string().nullable().describe('Bank name'),
  active: z.boolean().optional().describe('Observed active state'),
  accountNumber: z.string().optional().describe('Account number')
});

export let createTransferRecipient = SlateTool.create(spec, {
  name: 'Create Transfer Recipient',
  key: 'create_transfer_recipient',
  description: `Create a transfer recipient (bank account or mobile money) to receive funds. The recipient code can then be used to initiate transfers.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum([
          'nuban',
          'mobile_money',
          'basa',
          'authorization',
          'ghipss',
          'kepss',
          'mobile_money_business'
        ])
        .describe(
          'Recipient type: nuban (Nigerian bank), mobile_money, basa (South African bank), authorization'
        ),
      name: z.string().describe('Recipient name'),
      authorizationCode: z
        .string()
        .optional()
        .describe('Reusable authorization code; required for authorization recipients'),
      email: z
        .string()
        .optional()
        .describe(
          'Email bound to the reusable authorization; required for authorization recipients'
        ),
      accountNumber: z
        .string()
        .optional()
        .describe(
          'Account or mobile money number; required except for authorization recipients'
        ),
      bankCode: z
        .string()
        .optional()
        .describe('Bank code (use List Banks tool or verify bank account to find this)'),
      currency: z.string().optional().describe('Currency code (NGN, GHS, ZAR, KES)'),
      description: z.string().optional().describe('Description for the recipient'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(createTransferRecipientOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createTransferRecipient(ctx.input);
    const recipient = record(result.data);
    const details = optionalRecord(recipient.details);
    const output = {
      recipientCode: recipient.recipient_code,
      recipientId: optionalNumericId(recipient.id),
      exactRecipientId: exactId(recipient.id),
      name: recipient.name,
      type: recipient.type,
      bankName: details.bank_name ?? null,
      accountNumber: details.account_number ?? undefined,
      active: observedFlag(recipient.active)
    };
    return {
      output: validateOutput(createTransferRecipientOutput, output),
      message:
        'Recipient created or returned. Duplicate account details can return an existing recipient; creation is not proof of ownership.'
    };
  })
  .build();
const listTransfersOutput = z.object({
  transfers: z.array(
    z.object({
      transferCode: z.string().describe('Transfer code'),
      reference: z.string().describe('Transfer reference'),
      amount: z.number().describe('Amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Status'),
      reason: z.string().nullable().describe('Transfer reason'),
      exactRecipientId: z
        .string()
        .optional()
        .describe('Recipient ID when returned as an unexpanded relationship'),
      recipientCode: z.string().optional().describe('Recipient code'),
      createdAt: z.string().describe('Creation timestamp')
    })
  ),
  totalCount: z.number().optional().describe('Total transfers'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listTransfers = SlateTool.create(spec, {
  name: 'List Transfers',
  key: 'list_transfers',
  description: `Retrieve a paginated list of transfers. Filter by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      useCursor: z.boolean().optional().describe('Use cursor pagination; omit page when true'),
      next: z.string().optional().describe('Next cursor from the prior response'),
      previous: z.string().optional().describe('Previous cursor from the prior response'),
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listTransfersOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listTransfers(ctx.input);
    const output = {
      transfers: records(result.data).map(item => ({
        transferCode: item.transfer_code,
        reference: item.reference,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        reason: item.reason ?? null,
        recipientCode: optionalRecord(item.recipient).recipient_code,
        exactRecipientId: isProviderIdentifier(item.recipient)
          ? exactId(item.recipient)
          : optionalRecord(item.recipient).id === undefined
            ? undefined
            : exactId(optionalRecord(item.recipient).id),
        createdAt: item.created_at ?? item.createdAt
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listTransfersOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
