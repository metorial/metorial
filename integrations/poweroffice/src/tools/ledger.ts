import { SlateTool } from 'slates';
import { z } from 'zod';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  accountingDimensionOutputSchema,
  buildListParams,
  compactOutput,
  createClient,
  mapDimensions,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let accountTransactionSchema = z.object({
  id: z.string().optional().describe('PowerOffice transaction id.'),
  accountId: z.number().optional().describe('Account id.'),
  accountNo: z.number().optional().describe('Account number.'),
  postingDate: z.string().optional().describe('Posting date.'),
  voucherDate: z.string().optional().describe('Voucher date.'),
  voucherNo: z.number().optional().describe('Voucher number.'),
  voucherType: z.string().optional().describe('Voucher type.'),
  voucherDescription: z.string().optional().describe('Voucher description.'),
  description: z.string().optional().describe('Transaction description.'),
  amount: z.number().optional().describe('Amount in client currency.'),
  currencyAmount: z.number().optional().describe('Amount in transaction currency.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  vatAmount: z.number().optional().describe('VAT amount.'),
  vatCode: z.string().optional().describe('VAT code.'),
  vatRate: z.number().optional().describe('VAT rate.'),
  customerAccountNo: z.number().optional().describe('Customer account number.'),
  supplierAccountNo: z.number().optional().describe('Supplier account number.'),
  productCode: z.string().optional().describe('Product code.'),
  quantity: z.number().optional().describe('Quantity.'),
  isReversed: z.boolean().optional().describe('Whether the transaction is reversed.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  dimensions: accountingDimensionOutputSchema.optional(),
  record: rawRecordSchema
});

let trialBalanceLineSchema = z.object({
  accountId: z.number().optional().describe('Account id.'),
  accountNo: z.number().optional().describe('Account number.'),
  accountName: z.string().optional().describe('Account name.'),
  agricultureDepartment: z.string().optional().describe('Agriculture department.'),
  balance: z.number().optional().describe('Balance as of the requested date.'),
  record: rawRecordSchema
});

let mapAccountTransaction = (transaction: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(transaction, 'Id'),
    accountId: numberValue(transaction, 'AccountId'),
    accountNo: numberValue(transaction, 'AccountNo'),
    postingDate: stringValue(transaction, 'PostingDate'),
    voucherDate: stringValue(transaction, 'VoucherDate'),
    voucherNo: numberValue(transaction, 'VoucherNo'),
    voucherType: stringValue(transaction, 'VoucherType'),
    voucherDescription: stringValue(transaction, 'VoucherDescription'),
    description: stringValue(transaction, 'Description'),
    amount: numberValue(transaction, 'Amount'),
    currencyAmount: numberValue(transaction, 'CurrencyAmount'),
    currencyCode: stringValue(transaction, 'CurrencyCode'),
    vatAmount: numberValue(transaction, 'VatAmount'),
    vatCode: stringValue(transaction, 'VatCode'),
    vatRate: numberValue(transaction, 'VatRate'),
    customerAccountNo: numberValue(transaction, 'CustomerAccountNo'),
    supplierAccountNo: numberValue(transaction, 'SupplierAccountNo'),
    productCode: stringValue(transaction, 'ProductCode'),
    quantity: numberValue(transaction, 'Quantity'),
    isReversed:
      typeof transaction.IsReversed === 'boolean'
        ? (transaction.IsReversed as boolean)
        : undefined,
    createdDateTimeOffset: stringValue(transaction, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(transaction, 'LastChangedDateTimeOffset'),
    dimensions: mapDimensions(transaction)
  }),
  record: transaction
});

let mapTrialBalanceLine = (line: Record<string, unknown>) => ({
  ...compactOutput({
    accountId: numberValue(line, 'AccountId'),
    accountNo: numberValue(line, 'AccountNo'),
    accountName: stringValue(line, 'AccountName'),
    agricultureDepartment: stringValue(line, 'AgricultureDepartment'),
    balance: numberValue(line, 'Balance')
  }),
  record: line
});

export let powerofficeListAccountTransactions = SlateTool.create(spec, {
  name: 'List PowerOffice Account Transactions',
  key: 'poweroffice_list_account_transactions',
  description:
    'List posted PowerOffice ledger transaction lines for a date range with account, voucher, VAT, product, project, and department filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Required posting/voucher date from (YYYY-MM-DD).'),
      toDate: z.string().describe('Required posting/voucher date to (YYYY-MM-DD).'),
      accountNos: z.string().optional().describe('Account numbers filter.'),
      agricultureDepartments: z
        .string()
        .optional()
        .describe('Agriculture departments filter.'),
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return transactions created after this timestamp.'),
      departmentCodes: z.string().optional().describe('Department codes filter.'),
      includeSubProject: z.boolean().optional().describe('Include subprojects.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return transactions changed after this timestamp.'),
      productCodes: z.string().optional().describe('Product codes filter.'),
      projectCodes: z.string().optional().describe('Project codes filter.'),
      vatCodes: z.string().optional().describe('VAT codes filter.'),
      voucherNos: z.string().optional().describe('Voucher numbers filter.'),
      voucherTypes: z.string().optional().describe('Voucher types filter.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      transactions: z
        .array(accountTransactionSchema)
        .describe('PowerOffice account transactions.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.fromDate > ctx.input.toDate) {
      throw powerOfficeValidationError('fromDate must be earlier than or equal to toDate.');
    }

    let client = createClient(ctx);
    let transactions = await client.listAccountTransactions(
      buildListParams(ctx.input, {
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        accountNos: ctx.input.accountNos,
        agricultureDepartments: ctx.input.agricultureDepartments,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        departmentCodes: ctx.input.departmentCodes,
        includeSubProject: ctx.input.includeSubProject,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan,
        productCodes: ctx.input.productCodes,
        projectCodes: ctx.input.projectCodes,
        vatCodes: ctx.input.vatCodes,
        voucherNos: ctx.input.voucherNos,
        voucherTypes: ctx.input.voucherTypes
      })
    );

    return {
      output: {
        transactions: transactions.map(mapAccountTransaction),
        page: pageSummary(ctx.input, transactions.length)
      },
      message: `Retrieved **${transactions.length}** PowerOffice account transaction(s).`
    };
  })
  .build();

export let powerofficeGetTrialBalance = SlateTool.create(spec, {
  name: 'Get PowerOffice Trial Balance',
  key: 'poweroffice_get_trial_balance',
  description:
    'Get PowerOffice trial balance lines as of a specific date, optionally filtered by account and accounting dimensions.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Trial balance date (YYYY-MM-DD).'),
      accountNos: z.string().optional().describe('Account numbers filter.'),
      agricultureDepartments: z
        .string()
        .optional()
        .describe('Agriculture departments filter.'),
      departmentCodes: z.string().optional().describe('Department codes filter.'),
      hideAccountsWithZeroBalance: z
        .boolean()
        .optional()
        .describe('Hide accounts with zero balance.'),
      includeSubProject: z.boolean().optional().describe('Include subprojects.'),
      productCode: z.string().optional().describe('Product code filter.'),
      projectCode: z.string().optional().describe('Project code filter.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      lines: z.array(trialBalanceLineSchema).describe('Trial balance lines.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let lines = await client.getTrialBalance(
      buildListParams(ctx.input, {
        date: ctx.input.date,
        accountNos: ctx.input.accountNos,
        agricultureDepartments: ctx.input.agricultureDepartments,
        departmentCodes: ctx.input.departmentCodes,
        hideAccountsWithZeroBalance: ctx.input.hideAccountsWithZeroBalance,
        includeSubProject: ctx.input.includeSubProject,
        productCode: ctx.input.productCode,
        projectCode: ctx.input.projectCode
      })
    );

    return {
      output: {
        lines: lines.map(mapTrialBalanceLine),
        page: pageSummary(ctx.input, lines.length)
      },
      message: `Retrieved **${lines.length}** PowerOffice trial balance line(s).`
    };
  })
  .build();
