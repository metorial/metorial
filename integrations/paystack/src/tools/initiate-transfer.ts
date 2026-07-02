import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
    destructive: false,
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
  .output(
    z.object({
      transferCode: z.string().describe('Transfer code'),
      reference: z.string().describe('Transfer reference'),
      amount: z.number().describe('Transfer amount'),
      currency: z.string().describe('Currency'),
      status: z.string().describe('Transfer status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.initiateTransfer({
      source: 'balance',
      amount: ctx.input.amount,
      recipient: ctx.input.recipientCode,
      reason: ctx.input.reason,
      currency: ctx.input.currency,
      reference: ctx.input.reference
    });

    let transfer = result.data;

    return {
      output: {
        transferCode: transfer.transfer_code,
        reference: transfer.reference,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status
      },
      message: `Transfer **${transfer.transfer_code}** initiated. Amount: ${transfer.amount} ${transfer.currency}. Status: **${transfer.status}**.`
    };
  })
  .build();

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
        .enum(['nuban', 'mobile_money', 'basa', 'authorization'])
        .describe(
          'Recipient type: nuban (Nigerian bank), mobile_money, basa (South African bank), authorization'
        ),
      name: z.string().describe('Recipient name'),
      accountNumber: z.string().describe('Account number or mobile money number'),
      bankCode: z
        .string()
        .describe('Bank code (use List Banks tool or verify bank account to find this)'),
      currency: z.string().optional().describe('Currency code (NGN, GHS, ZAR, KES)'),
      description: z.string().optional().describe('Description for the recipient'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      recipientCode: z.string().describe('Recipient code for initiating transfers'),
      recipientId: z.number().describe('Recipient ID'),
      name: z.string().describe('Recipient name'),
      type: z.string().describe('Recipient type'),
      bankName: z.string().nullable().describe('Bank name'),
      accountNumber: z.string().describe('Account number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createTransferRecipient({
      type: ctx.input.type,
      name: ctx.input.name,
      accountNumber: ctx.input.accountNumber,
      bankCode: ctx.input.bankCode,
      currency: ctx.input.currency,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });

    let recipient = result.data;

    return {
      output: {
        recipientCode: recipient.recipient_code,
        recipientId: recipient.id,
        name: recipient.name,
        type: recipient.type,
        bankName: recipient.details?.bank_name ?? null,
        accountNumber: recipient.details?.account_number ?? ctx.input.accountNumber
      },
      message: `Transfer recipient **${recipient.name}** created (${recipient.recipient_code}).`
    };
  })
  .build();

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
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(
    z.object({
      transfers: z.array(
        z.object({
          transferCode: z.string().describe('Transfer code'),
          reference: z.string().describe('Transfer reference'),
          amount: z.number().describe('Amount'),
          currency: z.string().describe('Currency'),
          status: z.string().describe('Status'),
          reason: z.string().nullable().describe('Transfer reason'),
          recipientCode: z.string().describe('Recipient code'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total transfers'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listTransfers({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let transfers = (result.data ?? []).map((t: any) => ({
      transferCode: t.transfer_code,
      reference: t.reference,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      reason: t.reason ?? null,
      recipientCode: t.recipient?.recipient_code ?? '',
      createdAt: t.created_at ?? t.createdAt
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        transfers,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? transfers.length}** transfers.`
    };
  })
  .build();
