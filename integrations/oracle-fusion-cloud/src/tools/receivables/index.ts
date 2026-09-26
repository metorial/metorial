import { SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, andFilters } from '../../lib/filters';
import { oracleFinder } from '../../lib/finders';
import { pageOutputFields, paginationInputFields, resourceKeySchema } from '../../lib/schemas';
import { spec } from '../../spec';
import {
  customerAccountFields,
  customerAccountSchema,
  customerReceiptFields,
  customerReceiptSchema,
  customerSiteFields,
  customerSiteSchema,
  invoiceParentFields,
  invoiceParentOutputFields,
  mapCustomerAccount,
  mapCustomerReceipt,
  mapCustomerSite,
  mapInvoiceParent,
  mapReceivablesInvoice,
  mapReceivablesInvoiceInstallment,
  mapReceivablesInvoiceLine,
  receivablesInvoiceFields,
  receivablesInvoiceInstallmentFields,
  receivablesInvoiceInstallmentSchema,
  receivablesInvoiceLineFields,
  receivablesInvoiceLineSchema,
  receivablesInvoiceSchema
} from './models';

const accountNumber = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .optional()
  .describe('Optional exact customer account business number.');
const customerName = z
  .string()
  .trim()
  .min(1)
  .max(360)
  .optional()
  .describe('Optional exact customer party name.');
const businessUnit = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .optional()
  .describe('Optional exact business unit name.');
const customerAccountKey = resourceKeySchema.describe(
  'Customer account activity resourceKey returned by list_customer_accounts or get_customer_account. Use this key to navigate receipts; do not substitute accountId or accountNumber.'
);
const receivablesInvoiceKey = resourceKeySchema.describe(
  'Receivables invoice resourceKey returned by list_receivables_invoices or get_receivables_invoice. Use this parent key to navigate lines and installments; do not substitute customerTransactionId or transactionNumber.'
);
const accountFilterFields = ['AccountNumber', 'CustomerName'] as const;
const siteFilterFields = ['AccountNumber', 'CustomerName', 'BillToSiteNumber'] as const;
const receiptFilterFields = ['ReceiptNumber', 'BusinessUnit'] as const;
const invoiceFilterFields = ['TransactionNumber', 'InvoiceStatus'] as const;

export const listCustomerAccounts = SlateTool.create(spec, {
  name: 'List Customer Account Activities',
  key: 'list_customer_accounts',
  description:
    'List customer accounts available through Receivables account activities with exact account number or customer name filters, and discover resource keys for account details and receipts.',
  tags: { readOnly: true }
})
  .input(z.object({ accountNumber, customerName, ...paginationInputFields }).strict())
  .output(z.object({ items: z.array(customerAccountSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.accountNumber === undefined
        ? undefined
        : adfEquals('AccountNumber', ctx.input.accountNumber, accountFilterFields),
      ctx.input.customerName === undefined
        ? undefined
        : adfEquals('CustomerName', ctx.input.customerName, accountFilterFields)
    );
    const page = await client.list('fscm', '/receivablesCustomerAccountActivities', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: customerAccountFields,
      orderBy: 'AccountId:asc',
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapCustomerAccount(client, record)) },
      message: `Returned ${page.count} customer account activities.`
    };
  })
  .build();

export const getCustomerAccount = SlateTool.create(spec, {
  name: 'Get Customer Account Activity',
  key: 'get_customer_account',
  description:
    'Get a customer account from Receivables account activities, including account identity and ledger-currency balances. Call list_customer_accounts to discover its resource key.',
  tags: { readOnly: true }
})
  .input(z.object({ customerAccountKey }).strict())
  .output(customerAccountSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const record = await client.get(
      'fscm',
      '/receivablesCustomerAccountActivities',
      ctx.input.customerAccountKey,
      { fields: customerAccountFields, links: 'self' }
    );
    return {
      output: mapCustomerAccount(client, record),
      message: 'Retrieved the customer account activity.'
    };
  })
  .build();

export const listCustomerSites = SlateTool.create(spec, {
  name: 'List Customer Billing Site Activities',
  key: 'list_customer_sites',
  description:
    'List customer billing sites available through Receivables account site activities. Filter by the accountNumber discovered with list_customer_accounts, or an exact customer name or billing site number.',
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        accountNumber,
        customerName,
        billToSiteNumber: z
          .string()
          .trim()
          .min(1)
          .max(150)
          .optional()
          .describe('Optional exact customer billing site number.'),
        ...paginationInputFields
      })
      .strict()
  )
  .output(z.object({ items: z.array(customerSiteSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.accountNumber === undefined
        ? undefined
        : adfEquals('AccountNumber', ctx.input.accountNumber, siteFilterFields),
      ctx.input.customerName === undefined
        ? undefined
        : adfEquals('CustomerName', ctx.input.customerName, siteFilterFields),
      ctx.input.billToSiteNumber === undefined
        ? undefined
        : adfEquals('BillToSiteNumber', ctx.input.billToSiteNumber, siteFilterFields)
    );
    const page = await client.list('fscm', '/receivablesCustomerAccountSiteActivities', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      fields: customerSiteFields,
      orderBy: 'BillToSiteUseId:asc',
      links: 'self'
    });
    return {
      output: { ...page, items: page.items.map(record => mapCustomerSite(client, record)) },
      message: `Returned ${page.count} customer billing site activities.`
    };
  })
  .build();

export const listCustomerReceipts = SlateTool.create(spec, {
  name: 'List Customer Account Receipts',
  key: 'list_customer_receipts',
  description:
    'List standard receipts for one customer account activity with entered-currency amounts and current receipt states. Call list_customer_accounts or get_customer_account to discover the parent account resource key.',
  instructions: [
    'Oracle receipt inquiries default to a 90-day creation-date window. Set receiptLimitByDays to include older receipts.'
  ],
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        customerAccountKey,
        receiptNumber: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .optional()
          .describe('Optional exact receipt business number.'),
        businessUnit,
        processStatus: z
          .enum(['Open', 'Closed'])
          .optional()
          .describe('Optional receipt process status.'),
        receiptLimitByDays: z
          .number()
          .int()
          .min(1)
          .max(36500)
          .optional()
          .describe(
            'Optional receipt creation-date lookback in days. Oracle defaults to 90 days when omitted.'
          ),
        ...paginationInputFields
      })
      .strict()
  )
  .output(
    z.object({
      customerAccountKey,
      items: z.array(customerReceiptSchema),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const collection = client.childCollectionPath(
      '/receivablesCustomerAccountActivities',
      ctx.input.customerAccountKey,
      'standardReceipts'
    );
    const q = andFilters(
      ctx.input.receiptNumber === undefined
        ? undefined
        : adfEquals('ReceiptNumber', ctx.input.receiptNumber, receiptFilterFields),
      ctx.input.businessUnit === undefined
        ? undefined
        : adfEquals('BusinessUnit', ctx.input.businessUnit, receiptFilterFields)
    );
    const finder = oracleFinder('StandardReceiptsFinder', {
      ProcessStatus: ctx.input.processStatus,
      ReceiptLimitByDays: ctx.input.receiptLimitByDays ?? 90
    });
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      finder,
      fields: customerReceiptFields,
      orderBy: 'StandardReceiptId:asc',
      links: 'self'
    });
    return {
      output: {
        ...page,
        customerAccountKey: ctx.input.customerAccountKey,
        items: page.items.map(record => mapCustomerReceipt(client, collection, record))
      },
      message: `Returned ${page.count} customer receipts.`
    };
  })
  .build();

export const listReceivablesInvoices = SlateTool.create(spec, {
  name: 'List Receivables Invoices',
  key: 'list_receivables_invoices',
  description:
    'List customer receivables invoices with transaction number, billing customer account, business unit, and completion status filters. Discover resource keys for invoice details, lines, and installments.',
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        transactionNumber: z
          .string()
          .trim()
          .min(1)
          .max(20)
          .optional()
          .describe('Optional exact invoice transaction number.'),
        billToCustomerNumber: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .optional()
          .describe(
            'Optional billing customer account number search criterion, corresponding to accountNumber from list_customer_accounts.'
          ),
        businessUnit,
        invoiceStatus: z
          .enum(['Complete', 'Incomplete', 'Frozen'])
          .optional()
          .describe('Optional invoice completion status.'),
        ...paginationInputFields
      })
      .strict()
  )
  .output(z.object({ items: z.array(receivablesInvoiceSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const q = andFilters(
      ctx.input.transactionNumber === undefined
        ? undefined
        : adfEquals('TransactionNumber', ctx.input.transactionNumber, invoiceFilterFields),
      ctx.input.invoiceStatus === undefined
        ? undefined
        : adfEquals('InvoiceStatus', ctx.input.invoiceStatus, invoiceFilterFields)
    );
    const finder =
      ctx.input.billToCustomerNumber === undefined && ctx.input.businessUnit === undefined
        ? undefined
        : oracleFinder('invoiceSearch', {
            BillToCustomerNumber: ctx.input.billToCustomerNumber,
            BusinessUnit: ctx.input.businessUnit
          });
    const page = await client.list('fscm', '/receivablesInvoices', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      finder,
      fields: receivablesInvoiceFields,
      orderBy: 'CustomerTransactionId:asc',
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record => mapReceivablesInvoice(client, record))
      },
      message: `Returned ${page.count} receivables invoices.`
    };
  })
  .build();

export const getReceivablesInvoice = SlateTool.create(spec, {
  name: 'Get Receivables Invoice',
  key: 'get_receivables_invoice',
  description:
    'Get a customer receivables invoice header with billing identity, completion status, dates, and separately labeled entered and accounted amounts. Call list_receivables_invoices to discover its resource key.',
  tags: { readOnly: true }
})
  .input(z.object({ receivablesInvoiceKey }).strict())
  .output(receivablesInvoiceSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const record = await client.get(
      'fscm',
      '/receivablesInvoices',
      ctx.input.receivablesInvoiceKey,
      { fields: receivablesInvoiceFields, links: 'self' }
    );
    return {
      output: mapReceivablesInvoice(client, record),
      message: 'Retrieved the receivables invoice header.'
    };
  })
  .build();

export const listReceivablesInvoiceLines = SlateTool.create(spec, {
  name: 'List Receivables Invoice Lines',
  key: 'list_receivables_invoice_lines',
  description:
    'List product and service lines of a receivables invoice with item references, quantities, prices, and tax classifications. Call list_receivables_invoices or get_receivables_invoice to discover the parent invoice resource key.',
  tags: { readOnly: true }
})
  .input(z.object({ receivablesInvoiceKey, ...paginationInputFields }).strict())
  .output(
    z.object({
      ...invoiceParentOutputFields,
      items: z.array(receivablesInvoiceLineSchema),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const parent = mapInvoiceParent(
      client,
      await client.get('fscm', '/receivablesInvoices', ctx.input.receivablesInvoiceKey, {
        fields: invoiceParentFields,
        links: 'self'
      })
    );
    const collection = client.childCollectionPath(
      '/receivablesInvoices',
      ctx.input.receivablesInvoiceKey,
      'receivablesInvoiceLines'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: receivablesInvoiceLineFields,
      orderBy: 'CustomerTransactionLineId:asc',
      links: 'self'
    });
    return {
      output: {
        ...page,
        ...parent,
        items: page.items.map(record =>
          mapReceivablesInvoiceLine(client, collection, record, parent.invoiceCurrency)
        )
      },
      message: `Returned ${page.count} receivables invoice lines.`
    };
  })
  .build();

export const listReceivablesInvoiceInstallments = SlateTool.create(spec, {
  name: 'List Receivables Invoice Installments',
  key: 'list_receivables_invoice_installments',
  description:
    'List a receivables invoice’s payment installments with due dates, status, entered-currency balances, and separate ledger-currency balances. Call list_receivables_invoices or get_receivables_invoice to discover the parent invoice resource key.',
  tags: { readOnly: true }
})
  .input(z.object({ receivablesInvoiceKey, ...paginationInputFields }).strict())
  .output(
    z.object({
      ...invoiceParentOutputFields,
      items: z.array(receivablesInvoiceInstallmentSchema),
      ...pageOutputFields
    })
  )
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const parent = mapInvoiceParent(
      client,
      await client.get('fscm', '/receivablesInvoices', ctx.input.receivablesInvoiceKey, {
        fields: invoiceParentFields,
        links: 'self'
      })
    );
    const collection = client.childCollectionPath(
      '/receivablesInvoices',
      ctx.input.receivablesInvoiceKey,
      'receivablesInvoiceInstallments'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      fields: receivablesInvoiceInstallmentFields,
      orderBy: 'InstallmentId:asc',
      links: 'self'
    });
    return {
      output: {
        ...page,
        ...parent,
        items: page.items.map(record =>
          mapReceivablesInvoiceInstallment(client, collection, record, parent.invoiceCurrency)
        )
      },
      message: `Returned ${page.count} receivables invoice installments.`
    };
  })
  .build();

export const receivablesTools = {
  list_customer_accounts: listCustomerAccounts,
  get_customer_account: getCustomerAccount,
  list_customer_sites: listCustomerSites,
  list_customer_receipts: listCustomerReceipts,
  list_receivables_invoices: listReceivablesInvoices,
  get_receivables_invoice: getReceivablesInvoice,
  list_receivables_invoice_lines: listReceivablesInvoiceLines,
  list_receivables_invoice_installments: listReceivablesInvoiceInstallments
};
