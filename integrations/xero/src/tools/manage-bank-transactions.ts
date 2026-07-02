import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional().describe('Description of the line item'),
  quantity: z.number().optional().describe('Quantity'),
  unitAmount: z.number().optional().describe('Unit amount'),
  accountCode: z.string().optional().describe('Account code'),
  taxType: z.string().optional().describe('Tax type code'),
  itemCode: z.string().optional().describe('Item code')
});

let bankTransactionOutputSchema = z.object({
  bankTransactionId: z.string().optional().describe('Unique Xero bank transaction ID'),
  type: z
    .string()
    .optional()
    .describe('Transaction type: RECEIVE, SPEND, RECEIVE-OVERPAYMENT, etc.'),
  contactName: z.string().optional().describe('Contact name'),
  contactId: z.string().optional().describe('Contact ID'),
  bankAccountName: z.string().optional().describe('Bank account name'),
  bankAccountId: z.string().optional().describe('Bank account ID'),
  date: z.string().optional().describe('Transaction date'),
  reference: z.string().optional().describe('Transaction reference'),
  status: z.string().optional().describe('Status: AUTHORISED, DELETED'),
  isReconciled: z.boolean().optional().describe('Whether the transaction is reconciled'),
  subTotal: z.number().optional().describe('Subtotal'),
  totalTax: z.number().optional().describe('Total tax'),
  total: z.number().optional().describe('Total amount'),
  currencyCode: z.string().optional().describe('Currency code'),
  updatedDate: z.string().optional().describe('Last updated timestamp')
});

let mapBankTransaction = (bt: any) => ({
  bankTransactionId: bt.BankTransactionID,
  type: bt.Type,
  contactName: bt.Contact?.Name,
  contactId: bt.Contact?.ContactID,
  bankAccountName: bt.BankAccount?.Name,
  bankAccountId: bt.BankAccount?.AccountID,
  date: bt.Date,
  reference: bt.Reference,
  status: bt.Status,
  isReconciled: bt.IsReconciled,
  subTotal: bt.SubTotal,
  totalTax: bt.TotalTax,
  total: bt.Total,
  currencyCode: bt.CurrencyCode,
  updatedDate: bt.UpdatedDateUTC
});

export let createBankTransaction = SlateTool.create(spec, {
  name: 'Create Bank Transaction',
  key: 'create_bank_transaction',
  description: `Creates a spend or receive money transaction in Xero. Use RECEIVE for money coming in and SPEND for money going out. Links to a bank account and contact.`,
  instructions: [
    'Type "RECEIVE" records money received into the bank account',
    'Type "SPEND" records money spent from the bank account'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      type: z.enum(['RECEIVE', 'SPEND']).describe('RECEIVE for money in, SPEND for money out'),
      contactId: z.string().describe('Contact ID'),
      bankAccountId: z.string().describe('Bank account ID to use'),
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the transaction'),
      date: z.string().optional().describe('Transaction date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('Transaction reference'),
      lineAmountTypes: z
        .enum(['Exclusive', 'Inclusive', 'NoTax'])
        .optional()
        .describe('How amounts are calculated'),
      currencyCode: z.string().optional().describe('Currency code'),
      url: z.string().optional().describe('URL for the transaction source')
    })
  )
  .output(bankTransactionOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let transaction = await client.createBankTransaction({
      Type: ctx.input.type,
      Contact: { ContactID: ctx.input.contactId },
      BankAccount: { AccountID: ctx.input.bankAccountId },
      LineItems: ctx.input.lineItems.map(li => ({
        Description: li.description,
        Quantity: li.quantity,
        UnitAmount: li.unitAmount,
        AccountCode: li.accountCode,
        TaxType: li.taxType,
        ItemCode: li.itemCode
      })),
      Date: ctx.input.date,
      Reference: ctx.input.reference,
      LineAmountTypes: ctx.input.lineAmountTypes,
      CurrencyCode: ctx.input.currencyCode,
      Url: ctx.input.url
    });

    let output = mapBankTransaction(transaction);

    return {
      output,
      message: `Created **${ctx.input.type}** bank transaction for **${output.total?.toFixed(2)} ${output.currencyCode || ''}** — ${output.contactName}.`
    };
  })
  .build();

export let listBankTransactions = SlateTool.create(spec, {
  name: 'List Bank Transactions',
  key: 'list_bank_transactions',
  description: `Lists spend and receive money transactions from Xero. Supports filtering by date, type, and modification time.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return transactions modified after this date (ISO 8601)'),
      where: z
        .string()
        .optional()
        .describe(
          'Xero API where filter, e.g. `Type=="RECEIVE"` or `BankAccount.AccountID==guid("...")`'
        ),
      order: z.string().optional().describe('Order results, e.g. "Date DESC"')
    })
  )
  .output(
    z.object({
      bankTransactions: z
        .array(bankTransactionOutputSchema)
        .describe('List of bank transactions'),
      count: z.number().describe('Number of transactions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getBankTransactions({
      page: ctx.input.page,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order
    });

    let bankTransactions = (result.BankTransactions || []).map(mapBankTransaction);

    return {
      output: { bankTransactions, count: bankTransactions.length },
      message: `Found **${bankTransactions.length}** bank transaction(s).`
    };
  })
  .build();
