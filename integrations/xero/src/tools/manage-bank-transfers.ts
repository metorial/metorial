import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { xeroServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let bankTransferOutputSchema = z.object({
  bankTransferId: z.string().optional().describe('Unique Xero bank transfer ID'),
  fromBankAccountId: z.string().optional().describe('Source bank account ID'),
  fromBankAccountCode: z.string().optional().describe('Source bank account code'),
  fromBankAccountName: z.string().optional().describe('Source bank account name'),
  toBankAccountId: z.string().optional().describe('Destination bank account ID'),
  toBankAccountCode: z.string().optional().describe('Destination bank account code'),
  toBankAccountName: z.string().optional().describe('Destination bank account name'),
  amount: z.number().optional().describe('Transfer amount'),
  date: z.string().optional().describe('Transfer date'),
  reference: z.string().optional().describe('Transfer reference'),
  currencyRate: z.number().optional().describe('Currency exchange rate'),
  fromBankTransactionId: z.string().optional().describe('Source bank transaction ID'),
  toBankTransactionId: z.string().optional().describe('Destination bank transaction ID'),
  fromIsReconciled: z
    .boolean()
    .optional()
    .describe('Whether the source transaction is reconciled'),
  toIsReconciled: z
    .boolean()
    .optional()
    .describe('Whether the destination transaction is reconciled'),
  hasAttachments: z.boolean().optional().describe('Whether the bank transfer has attachments'),
  createdDate: z.string().optional().describe('Transfer creation timestamp')
});

let mapBankTransfer = (transfer: any) => ({
  bankTransferId: transfer.BankTransferID,
  fromBankAccountId: transfer.FromBankAccount?.AccountID,
  fromBankAccountCode: transfer.FromBankAccount?.Code,
  fromBankAccountName: transfer.FromBankAccount?.Name,
  toBankAccountId: transfer.ToBankAccount?.AccountID,
  toBankAccountCode: transfer.ToBankAccount?.Code,
  toBankAccountName: transfer.ToBankAccount?.Name,
  amount: transfer.Amount,
  date: transfer.DateString || transfer.Date,
  reference: transfer.Reference,
  currencyRate: transfer.CurrencyRate,
  fromBankTransactionId: transfer.FromBankTransactionID,
  toBankTransactionId: transfer.ToBankTransactionID,
  fromIsReconciled: transfer.FromIsReconciled,
  toIsReconciled: transfer.ToIsReconciled,
  hasAttachments: transfer.HasAttachments,
  createdDate: transfer.CreatedDateUTC
});

let accountSelector = (accountId?: string, code?: string) => {
  if (accountId) return { AccountID: accountId };
  if (code) return { Code: code };
  return undefined;
};

export let listBankTransfers = SlateTool.create(spec, {
  name: 'List Bank Transfers',
  key: 'list_bank_transfers',
  description: `Lists bank transfers between bank accounts in Xero. Supports Xero where filters, ordering, and If-Modified-Since filtering for incremental syncs.`,
  instructions: [
    'Use where for advanced filters, e.g. `HasAttachments==true`',
    'Use list_accounts with `Type=="BANK"` to find bank account IDs or codes'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return transfers modified after this date (ISO 8601)'),
      where: z.string().optional().describe('Xero API where filter expression'),
      order: z.string().optional().describe('Order results, e.g. "Amount ASC"')
    })
  )
  .output(
    z.object({
      bankTransfers: z.array(bankTransferOutputSchema).describe('List of bank transfers'),
      count: z.number().describe('Number of bank transfers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getBankTransfers({
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order
    });
    let bankTransfers = (result.BankTransfers || []).map(mapBankTransfer);

    return {
      output: { bankTransfers, count: bankTransfers.length },
      message: `Found **${bankTransfers.length}** bank transfer(s).`
    };
  })
  .build();

export let getBankTransfer = SlateTool.create(spec, {
  name: 'Get Bank Transfer',
  key: 'get_bank_transfer',
  description: `Retrieves a single Xero bank transfer by ID, including source and destination bank accounts, linked bank transaction IDs, amount, reconciliation state, and attachment state.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      bankTransferId: z.string().describe('The Xero bank transfer ID')
    })
  )
  .output(bankTransferOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let transfer = await client.getBankTransfer(ctx.input.bankTransferId);
    let output = mapBankTransfer(transfer);

    return {
      output,
      message: `Retrieved bank transfer **${output.bankTransferId}** for **${output.amount?.toFixed(2)}**.`
    };
  })
  .build();

export let createBankTransfer = SlateTool.create(spec, {
  name: 'Create Bank Transfer',
  key: 'create_bank_transfer',
  description: `Creates a transfer between two Xero bank accounts. Provide each bank account by ID or account code, plus the transfer amount and optional date/reference.`,
  instructions: [
    'Provide fromBankAccountId or fromBankAccountCode',
    'Provide toBankAccountId or toBankAccountCode',
    'Bank transfers cannot be deleted via the Xero Accounting API'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      fromBankAccountId: z.string().optional().describe('Source bank account ID'),
      fromBankAccountCode: z.string().optional().describe('Source bank account code'),
      toBankAccountId: z.string().optional().describe('Destination bank account ID'),
      toBankAccountCode: z.string().optional().describe('Destination bank account code'),
      amount: z.number().positive().describe('Transfer amount'),
      date: z.string().optional().describe('Transfer date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('Transfer reference')
    })
  )
  .output(bankTransferOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let fromBankAccount = accountSelector(
      ctx.input.fromBankAccountId,
      ctx.input.fromBankAccountCode
    );
    let toBankAccount = accountSelector(
      ctx.input.toBankAccountId,
      ctx.input.toBankAccountCode
    );

    if (!fromBankAccount) {
      throw xeroServiceError('Provide fromBankAccountId or fromBankAccountCode.');
    }
    if (!toBankAccount) {
      throw xeroServiceError('Provide toBankAccountId or toBankAccountCode.');
    }

    let transfer = await client.createBankTransfer({
      FromBankAccount: fromBankAccount,
      ToBankAccount: toBankAccount,
      Amount: ctx.input.amount,
      Date: ctx.input.date,
      Reference: ctx.input.reference
    });
    let output = mapBankTransfer(transfer);

    return {
      output,
      message: `Created bank transfer **${output.bankTransferId}** for **${output.amount?.toFixed(2)}**.`
    };
  })
  .build();
