import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { fikenValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  accountBalanceSchema,
  accountSchema,
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  attachmentMetadataSchema,
  companySlugFor,
  companySlugInput,
  contactNoteSchema,
  createClient,
  listMetadata,
  mapAccount,
  mapAccountBalance,
  mapAttachment,
  mapProject,
  mapPurchase,
  mapSale,
  paginationInputShape,
  paginationOutputShape,
  paginationParams,
  projectSchema,
  purchaseSchema,
  rawRecordSchema,
  saleSchema
} from './shared';

let purchaseSortSchema = z.enum(['date asc', 'date desc']);

let accountCodePattern = /^\d{4}(?::\d{5})?$/;

let isValidDate = (value: string) => {
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  let year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);
  let date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

let validateAccountBalanceRequest = (input: { accountCode: string; date: string }) => {
  if (!accountCodePattern.test(input.accountCode)) {
    throw fikenValidationError(
      'accountCode must be four digits, or four digits followed by a colon and five digits, for example 3020 or 1500:10001.'
    );
  }

  if (!isValidDate(input.date)) {
    throw fikenValidationError('date must be a valid date formatted as YYYY-MM-DD.');
  }
};

export let purchaseLineSchema = z.object({
  lineId: z.number().optional(),
  description: z.string().optional(),
  netPrice: z.number().optional(),
  vat: z.number().optional(),
  account: z.string().optional(),
  vatType: z.string().optional(),
  netPriceInCurrency: z.number().optional(),
  vatInCurrency: z.number().optional(),
  projectId: z.number().optional(),
  raw: rawRecordSchema
});

export let purchasePaymentSchema = z.object({
  paymentId: z.number().optional(),
  date: z.string().optional(),
  account: z.string().optional(),
  amount: z.number().optional(),
  amountInNok: z.number().optional(),
  currency: z.string().optional(),
  fee: z.number().optional(),
  raw: rawRecordSchema
});

export let detailedPurchaseSchema = purchaseSchema.extend({
  paymentAccount: z.string().optional(),
  kid: z.string().optional(),
  lines: z.array(purchaseLineSchema),
  payments: z.array(purchasePaymentSchema),
  attachments: z.array(attachmentMetadataSchema),
  projects: z.array(projectSchema)
});

let mapPurchaseLine = (value: unknown): z.infer<typeof purchaseLineSchema> => {
  let record = asRecord(value);
  return {
    lineId: asNumber(record.lineId),
    description: asString(record.description),
    netPrice: asNumber(record.netPrice),
    vat: asNumber(record.vat),
    account: asString(record.account),
    vatType: asString(record.vatType),
    netPriceInCurrency: asNumber(record.netPriceInCurrency),
    vatInCurrency: asNumber(record.vatInCurrency),
    projectId: asNumber(record.projectId),
    raw: record
  };
};

let mapPurchasePayment = (value: unknown): z.infer<typeof purchasePaymentSchema> => {
  let record = asRecord(value);
  return {
    paymentId: asNumber(record.paymentId),
    date: asString(record.date),
    account: asString(record.account),
    amount: asNumber(record.amount),
    amountInNok: asNumber(record.amountInNok),
    currency: asString(record.currency),
    fee: asNumber(record.fee),
    raw: record
  };
};

export let mapDetailedPurchase = (value: unknown): z.infer<typeof detailedPurchaseSchema> => {
  let record = asRecord(value);
  let lines = asArray(record.lines).map(mapPurchaseLine);
  let payments = asArray(record.payments).map(mapPurchasePayment);
  let attachments = asArray(record.purchaseAttachments).map(mapAttachment);
  let projects = asArray(record.project).map(mapProject);

  return {
    ...mapPurchase(value),
    paymentAccount: asString(record.paymentAccount),
    kid: asString(record.kid),
    lines,
    payments,
    attachments,
    projects,
    lineCount: lines.length,
    paymentCount: payments.length,
    attachmentCount: attachments.length,
    deleted: asBoolean(record.deleted),
    raw: record
  };
};

export let saleLineSchema = z.object({
  lineId: z.number().optional(),
  description: z.string().optional(),
  netPrice: z.number().optional(),
  vat: z.number().optional(),
  account: z.string().optional(),
  vatType: z.string().optional(),
  netPriceInCurrency: z.number().optional(),
  vatInCurrency: z.number().optional(),
  projectId: z.number().optional(),
  raw: rawRecordSchema
});

export let salePaymentSchema = z.object({
  paymentId: z.number().optional(),
  date: z.string().optional(),
  account: z.string().optional(),
  amount: z.number().optional(),
  amountInNok: z.number().optional(),
  currency: z.string().optional(),
  fee: z.number().optional(),
  raw: rawRecordSchema
});

export let detailedSaleSchema = saleSchema.extend({
  lastModifiedDate: z.string().optional(),
  totalPaidInCurrency: z.number().optional(),
  outstandingBalanceInCurrency: z.number().optional(),
  kid: z.string().optional(),
  paymentAccount: z.string().optional(),
  paymentDate: z.string().optional(),
  lines: z.array(saleLineSchema),
  payments: z.array(salePaymentSchema),
  attachments: z.array(attachmentMetadataSchema),
  project: projectSchema.optional(),
  notes: z.array(contactNoteSchema)
});

let mapSaleLine = (value: unknown): z.infer<typeof saleLineSchema> => {
  let record = asRecord(value);
  return {
    lineId: asNumber(record.lineId),
    description: asString(record.description),
    netPrice: asNumber(record.netPrice),
    vat: asNumber(record.vat),
    account: asString(record.account),
    vatType: asString(record.vatType),
    netPriceInCurrency: asNumber(record.netPriceInCurrency),
    vatInCurrency: asNumber(record.vatInCurrency),
    projectId: asNumber(record.projectId),
    raw: record
  };
};

let mapSalePayment = (value: unknown): z.infer<typeof salePaymentSchema> => {
  let record = asRecord(value);
  return {
    paymentId: asNumber(record.paymentId),
    date: asString(record.date),
    account: asString(record.account),
    amount: asNumber(record.amount),
    amountInNok: asNumber(record.amountInNok),
    currency: asString(record.currency),
    fee: asNumber(record.fee),
    raw: record
  };
};

let mapSaleNote = (value: unknown): z.infer<typeof contactNoteSchema> => {
  let record = asRecord(value);
  return {
    author: asString(record.author),
    note: asString(record.note)
  };
};

export let mapDetailedSale = (value: unknown): z.infer<typeof detailedSaleSchema> => {
  let record = asRecord(value);
  let lines = asArray(record.lines).map(mapSaleLine);
  let payments = asArray(record.salePayments).map(mapSalePayment);
  let attachments = asArray(record.saleAttachments).map(mapAttachment);
  let projectRecord = asRecord(record.project);
  let project = Object.keys(projectRecord).length > 0 ? mapProject(record.project) : undefined;
  let notes = asArray(record.notes).map(mapSaleNote);

  return {
    ...mapSale(value),
    lastModifiedDate: asString(record.lastModifiedDate),
    totalPaidInCurrency: asNumber(record.totalPaidInCurrency),
    outstandingBalanceInCurrency: asNumber(record.outstandingBalanceInCurrency),
    kid: asString(record.kid),
    paymentAccount: asString(record.paymentAccount),
    paymentDate: asString(record.paymentDate),
    lines,
    payments,
    attachments,
    project,
    notes,
    lineCount: lines.length,
    paymentCount: payments.length,
    attachmentCount: attachments.length,
    raw: record
  };
};

export let listPurchases = SlateTool.create(spec, {
  name: 'List Purchases',
  key: 'list_purchases',
  description:
    'Lists Fiken purchases for a company with filters for date, settled date, paid status, supplier/contact id, and sort order.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      contactId: z.number().int().positive().optional().describe('Supplier contact id.'),
      paid: z.boolean().optional(),
      date: z.string().optional().describe('Exact purchase date, YYYY-MM-DD.'),
      dateFrom: z.string().optional().describe('Purchase date on or after this date.'),
      dateTo: z.string().optional().describe('Purchase date on or before this date.'),
      dateAfter: z.string().optional().describe('Purchase date strictly after this date.'),
      dateBefore: z.string().optional().describe('Purchase date strictly before this date.'),
      settledDate: z.string().optional().describe('Exact settled date, YYYY-MM-DD.'),
      settledDateFrom: z.string().optional(),
      settledDateTo: z.string().optional(),
      settledDateAfter: z
        .string()
        .optional()
        .describe('Settled date strictly after this date.'),
      settledDateBefore: z
        .string()
        .optional()
        .describe('Settled date strictly before this date.'),
      sortBy: purchaseSortSchema.optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      purchases: z.array(purchaseSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listPurchases(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        contactId: ctx.input.contactId,
        paid: ctx.input.paid,
        date: ctx.input.date,
        dateGe: ctx.input.dateFrom,
        dateLe: ctx.input.dateTo,
        dateGt: ctx.input.dateAfter,
        dateLt: ctx.input.dateBefore,
        settledDate: ctx.input.settledDate,
        settledDateGe: ctx.input.settledDateFrom,
        settledDateLe: ctx.input.settledDateTo,
        settledDateGt: ctx.input.settledDateAfter,
        settledDateLt: ctx.input.settledDateBefore,
        sortBy: ctx.input.sortBy
      })
    );
    let purchases = response.items.map(mapPurchase);

    return {
      output: {
        companySlug,
        purchases,
        ...listMetadata(response)
      },
      message: `Found **${purchases.length}** Fiken purchase${purchases.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getPurchase = SlateTool.create(spec, {
  name: 'Get Purchase',
  key: 'get_purchase',
  description: 'Retrieves one Fiken purchase by purchase id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      purchaseId: z.number().int().positive().describe('Fiken purchase id.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      purchase: detailedPurchaseSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let purchase = mapDetailedPurchase(
      await client.getPurchase(companySlug, ctx.input.purchaseId)
    );

    return {
      output: {
        companySlug,
        purchase
      },
      message: `Retrieved Fiken purchase **${purchase.identifier ?? ctx.input.purchaseId}**.`
    };
  })
  .build();

export let listSales = SlateTool.create(spec, {
  name: 'List Sales',
  key: 'list_sales',
  description:
    'Lists Fiken sales for a company with filters for date, last modified date, sale number, settled status, and customer/contact id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      contactId: z.number().int().positive().optional().describe('Customer contact id.'),
      saleNumber: z.string().optional(),
      settled: z.boolean().optional(),
      date: z.string().optional().describe('Exact sale date, YYYY-MM-DD.'),
      dateFrom: z.string().optional().describe('Sale date on or after this date.'),
      dateTo: z.string().optional().describe('Sale date on or before this date.'),
      dateAfter: z.string().optional().describe('Sale date strictly after this date.'),
      dateBefore: z.string().optional().describe('Sale date strictly before this date.'),
      lastModified: z.string().optional().describe('Exact last modified date, YYYY-MM-DD.'),
      lastModifiedFrom: z.string().optional().describe('Modified on or after this date.'),
      lastModifiedTo: z.string().optional().describe('Modified on or before this date.'),
      lastModifiedAfter: z.string().optional().describe('Modified strictly after this date.'),
      lastModifiedBefore: z.string().optional().describe('Modified strictly before this date.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      sales: z.array(saleSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listSales(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        contactId: ctx.input.contactId,
        saleNumber: ctx.input.saleNumber,
        settled: ctx.input.settled,
        date: ctx.input.date,
        dateGe: ctx.input.dateFrom,
        dateLe: ctx.input.dateTo,
        dateGt: ctx.input.dateAfter,
        dateLt: ctx.input.dateBefore,
        lastModified: ctx.input.lastModified,
        lastModifiedGe: ctx.input.lastModifiedFrom,
        lastModifiedLe: ctx.input.lastModifiedTo,
        lastModifiedGt: ctx.input.lastModifiedAfter,
        lastModifiedLt: ctx.input.lastModifiedBefore
      })
    );
    let sales = response.items.map(mapSale);

    return {
      output: {
        companySlug,
        sales,
        ...listMetadata(response)
      },
      message: `Found **${sales.length}** Fiken sale${sales.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getSale = SlateTool.create(spec, {
  name: 'Get Sale',
  key: 'get_sale',
  description: 'Retrieves one Fiken sale by sale id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      saleId: z.number().int().positive().describe('Fiken sale id.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      sale: detailedSaleSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let sale = mapDetailedSale(await client.getSale(companySlug, ctx.input.saleId));

    return {
      output: {
        companySlug,
        sale
      },
      message: `Retrieved Fiken sale **${sale.saleNumber ?? ctx.input.saleId}**.`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'Lists Fiken bookkeeping accounts for the current year with optional account range filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      fromAccount: z.number().int().optional(),
      toAccount: z.number().int().optional(),
      range: z
        .string()
        .optional()
        .describe('Comma-separated account numbers or ranges, for example 1000-1500,2000.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      accounts: z.array(accountSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listAccounts(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        fromAccount: ctx.input.fromAccount,
        toAccount: ctx.input.toAccount,
        range: ctx.input.range
      })
    );
    let accounts = response.items.map(mapAccount);

    return {
      output: {
        companySlug,
        accounts,
        ...listMetadata(response)
      },
      message: `Found **${accounts.length}** Fiken account${accounts.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: 'Retrieves one Fiken bookkeeping account by account code.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      accountCode: z.string().describe('Fiken account code, for example 3020 or 1500:10001.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      account: accountSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let account = mapAccount(await client.getAccount(companySlug, ctx.input.accountCode));

    return {
      output: {
        companySlug,
        account
      },
      message: `Retrieved Fiken account **${account.code ?? ctx.input.accountCode}**.`
    };
  })
  .build();

export let listAccountBalances = SlateTool.create(spec, {
  name: 'List Account Balances',
  key: 'list_account_balances',
  description: 'Lists Fiken bookkeeping accounts and closing balances for a required date.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      date: z.string().describe('Balance date, YYYY-MM-DD.'),
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      fromAccount: z.number().int().optional(),
      toAccount: z.number().int().optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      balances: z.array(accountBalanceSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listAccountBalances(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        date: ctx.input.date,
        fromAccount: ctx.input.fromAccount,
        toAccount: ctx.input.toAccount
      })
    );
    let balances = response.items.map(mapAccountBalance);

    return {
      output: {
        companySlug,
        balances,
        ...listMetadata(response)
      },
      message: `Found **${balances.length}** Fiken account balance${balances.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getAccountBalance = SlateTool.create(spec, {
  name: 'Get Account Balance',
  key: 'get_account_balance',
  description: 'Retrieves one Fiken account and its closing balance for a required date.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      accountCode: z.string().describe('Fiken account code.'),
      date: z.string().describe('Balance date, YYYY-MM-DD.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      balance: accountBalanceSchema.describe(
        'Fiken account balance. The balance amount is returned in cents/minor units.'
      )
    })
  )
  .handleInvocation(async ctx => {
    validateAccountBalanceRequest(ctx.input);
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let balance = mapAccountBalance(
      await client.getAccountBalance(companySlug, ctx.input.accountCode, ctx.input.date)
    );

    return {
      output: {
        companySlug,
        balance
      },
      message: `Retrieved Fiken balance for account **${balance.code ?? ctx.input.accountCode}**.`
    };
  })
  .build();
