import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { combineFilters, escapeFilterString, listParams, pageInfo } from '../lib/client';
import { spec } from '../spec';
import {
  arrayValue,
  booleanValue,
  compactOutput,
  companyKeyInputSchema,
  createClient,
  expandInputSchema,
  filterInputSchema,
  idInputSchema,
  includeDeletedInputSchema,
  numberFromKeys,
  numberValue,
  pageInfoSchema,
  rawRecordSchema,
  recordValue,
  requireAtLeastOne,
  selectInputSchema,
  skipInputSchema,
  stringFromKeys,
  stringValue,
  type ToolContext,
  topInputSchema,
  unknownString,
  updatedSinceInputSchema
} from './shared';

let companySchema = z.object({
  id: z.number().optional(),
  companyKey: z.string().optional(),
  name: z.string().optional(),
  organizationNumber: z.string().optional(),
  isTest: z.boolean().optional(),
  record: rawRecordSchema
});

let customerSchema = z.object({
  id: z.number().optional(),
  customerNumber: z.number().optional(),
  name: z.string().optional(),
  organizationNumber: z.string().optional(),
  statusCode: z.number().optional(),
  deleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let supplierSchema = z.object({
  id: z.number().optional(),
  supplierNumber: z.number().optional(),
  name: z.string().optional(),
  organizationNumber: z.string().optional(),
  statusCode: z.number().optional(),
  deleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let invoiceSchema = z.object({
  id: z.number().optional(),
  invoiceNumber: z.string().optional(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
  supplierId: z.number().optional(),
  supplierName: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentDueDate: z.string().optional(),
  statusCode: z.number().optional(),
  paymentStatus: z.number().optional(),
  taxExclusiveAmount: z.number().optional(),
  taxInclusiveAmount: z.number().optional(),
  restAmount: z.number().optional(),
  currencyCodeId: z.number().optional(),
  itemCount: z.number().optional(),
  deleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let productSchema = z.object({
  id: z.number().optional(),
  partName: z.string().optional(),
  name: z.string().optional(),
  externalProductNumber: z.string().optional(),
  unit: z.string().optional(),
  accountId: z.number().optional(),
  vatTypeId: z.number().optional(),
  priceExVat: z.number().optional(),
  priceIncVat: z.number().optional(),
  statusCode: z.number().optional(),
  deleted: z.boolean().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let accountSchema = z.object({
  id: z.number().optional(),
  accountId: z.number().optional(),
  accountNumber: z.number().optional(),
  accountName: z.string().optional(),
  active: z.boolean().optional(),
  visible: z.boolean().optional(),
  systemAccount: z.boolean().optional(),
  locked: z.boolean().optional(),
  deleted: z.boolean().optional(),
  statusCode: z.number().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let journalEntrySchema = z.object({
  id: z.number().optional(),
  journalEntryNumber: z.string().optional(),
  journalEntryNumberNumeric: z.number().optional(),
  description: z.string().optional(),
  financialYearId: z.number().optional(),
  statusCode: z.number().optional(),
  lineCount: z.number().optional(),
  deleted: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let projectSchema = z.object({
  id: z.number().optional(),
  projectNumber: z.string().optional(),
  name: z.string().optional(),
  projectCustomerId: z.number().optional(),
  projectLeadName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  statusCode: z.number().optional(),
  visible: z.boolean().optional(),
  deleted: z.boolean().optional(),
  updatedAt: z.string().optional(),
  record: rawRecordSchema
});

let reportSchema = z.object({
  report: z.any().describe('Raw UniMicro accounting report payload.')
});

let commonListInput = {
  companyKey: companyKeyInputSchema,
  top: topInputSchema,
  skip: skipInputSchema,
  filter: filterInputSchema,
  select: selectInputSchema,
  expand: expandInputSchema,
  updatedSince: updatedSinceInputSchema,
  includeDeleted: includeDeletedInputSchema
};

let commonGetInput = {
  companyKey: companyKeyInputSchema,
  expand: expandInputSchema,
  select: selectInputSchema
};

let deletedFilter = (includeDeleted: boolean | undefined) =>
  includeDeleted === true ? undefined : 'Deleted eq false';

let updatedSinceFilter = (value: string | undefined) =>
  value ? `UpdatedAt ge '${escapeFilterString(value)}'` : undefined;

let containsFilter = (field: string, value: string | undefined) =>
  value ? `contains(${field},'${escapeFilterString(value)}')` : undefined;

let eqNumberFilter = (field: string, value: number | undefined) =>
  value === undefined ? undefined : `${field} eq ${value}`;

let eqStringFilter = (field: string, value: string | undefined) =>
  value ? `${field} eq '${escapeFilterString(value)}'` : undefined;

let dateRangeFilter = (field: string, from?: string, to?: string) =>
  combineFilters(
    from ? `${field} ge '${escapeFilterString(from)}'` : undefined,
    to ? `${field} le '${escapeFilterString(to)}'` : undefined
  );

let page = (ctx: ToolContext, count: number) =>
  pageInfo(ctx.input, count, ctx.config.defaultTop ?? 50);

let listQuery = (ctx: ToolContext, filter?: string) =>
  listParams(ctx.input, {
    top: ctx.config.defaultTop,
    filter
  });

let mapCompany = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberFromKeys(record, ['ID', 'Id', 'CompanyID', 'CompanyId', 'id']),
    companyKey: stringFromKeys(record, ['CompanyKey', 'Key', 'companyKey', 'key']),
    name: stringFromKeys(record, ['Name', 'CompanyName', 'name']),
    organizationNumber: stringFromKeys(record, [
      'OrgNumber',
      'OrganizationNumber',
      'organizationNumber'
    ]),
    isTest:
      booleanValue(record, 'IsTest') ??
      booleanValue(record, 'isTest') ??
      booleanValue(record, 'Test')
  }),
  record
});

let relationName = (record: Record<string, unknown>) =>
  stringValue(recordValue(record, 'Info') ?? {}, 'Name') ??
  stringValue(record, 'Name') ??
  stringValue(record, 'CustomerName') ??
  stringValue(record, 'SupplierName');

let mapCustomer = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    customerNumber: numberValue(record, 'CustomerNumber'),
    name: relationName(record),
    organizationNumber: stringValue(record, 'OrgNumber'),
    statusCode: numberValue(record, 'StatusCode'),
    deleted: booleanValue(record, 'Deleted'),
    createdAt: stringValue(record, 'CreatedAt'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let mapSupplier = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    supplierNumber: numberValue(record, 'SupplierNumber'),
    name: relationName(record),
    organizationNumber: stringValue(record, 'OrgNumber'),
    statusCode: numberValue(record, 'StatusCode'),
    deleted: booleanValue(record, 'Deleted'),
    createdAt: stringValue(record, 'CreatedAt'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let mapSupplierName = (record: Record<string, unknown>) => {
  let supplier = recordValue(record, 'Supplier');
  return supplier ? relationName(supplier) : stringValue(record, 'SupplierName');
};

let mapInvoice = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    invoiceNumber: unknownString(record.InvoiceNumber),
    customerId: numberValue(record, 'CustomerID'),
    customerName: stringValue(record, 'CustomerName'),
    supplierId: numberValue(record, 'SupplierID'),
    supplierName: mapSupplierName(record),
    invoiceDate: stringValue(record, 'InvoiceDate'),
    paymentDueDate: stringValue(record, 'PaymentDueDate'),
    statusCode: numberValue(record, 'StatusCode'),
    paymentStatus: numberValue(record, 'PaymentStatus'),
    taxExclusiveAmount: numberValue(record, 'TaxExclusiveAmount'),
    taxInclusiveAmount: numberValue(record, 'TaxInclusiveAmount'),
    restAmount: numberValue(record, 'RestAmount'),
    currencyCodeId: numberValue(record, 'CurrencyCodeID'),
    itemCount: arrayValue(record, 'Items')?.length,
    deleted: booleanValue(record, 'Deleted'),
    createdAt: stringValue(record, 'CreatedAt'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let mapProduct = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    partName: stringValue(record, 'PartName'),
    name: stringValue(record, 'Name'),
    externalProductNumber: stringValue(record, 'ExternalProductNumber'),
    unit: stringValue(record, 'Unit'),
    accountId: numberValue(record, 'AccountID'),
    vatTypeId: numberValue(record, 'VatTypeID'),
    priceExVat: numberValue(record, 'PriceExVat'),
    priceIncVat: numberValue(record, 'PriceIncVat'),
    statusCode: numberValue(record, 'StatusCode'),
    deleted: booleanValue(record, 'Deleted'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let mapAccount = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    accountId: numberValue(record, 'AccountID'),
    accountNumber: numberValue(record, 'AccountNumber'),
    accountName: stringValue(record, 'AccountName'),
    active: booleanValue(record, 'Active'),
    visible: booleanValue(record, 'Visible'),
    systemAccount: booleanValue(record, 'SystemAccount'),
    locked: booleanValue(record, 'Locked'),
    deleted: booleanValue(record, 'Deleted'),
    statusCode: numberValue(record, 'StatusCode'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let mapJournalEntry = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    journalEntryNumber: stringValue(record, 'JournalEntryNumber'),
    journalEntryNumberNumeric: numberValue(record, 'JournalEntryNumberNumeric'),
    description: stringValue(record, 'Description'),
    financialYearId: numberValue(record, 'FinancialYearID'),
    statusCode: numberValue(record, 'StatusCode'),
    lineCount: arrayValue(record, 'Lines')?.length ?? arrayValue(record, 'DraftLines')?.length,
    deleted: booleanValue(record, 'Deleted'),
    createdAt: stringValue(record, 'CreatedAt'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let mapProject = (record: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(record, 'ID'),
    projectNumber: unknownString(record.ProjectNumber),
    name: stringValue(record, 'Name'),
    projectCustomerId: numberValue(record, 'ProjectCustomerID'),
    projectLeadName: stringValue(record, 'ProjectLeadName'),
    startDate: stringValue(record, 'StartDate'),
    endDate: stringValue(record, 'EndDate'),
    statusCode: numberValue(record, 'StatusCode'),
    visible: booleanValue(record, 'Visible'),
    deleted: booleanValue(record, 'Deleted'),
    updatedAt: stringValue(record, 'UpdatedAt')
  }),
  record
});

let financialYearInput = z
  .number()
  .int()
  .optional()
  .describe('UniMicro FinancialYear query parameter for this report action.');

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description:
    'List companies available to the authenticated UniMicro user so callers can choose the CompanyKey required by business tools.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companies: z.array(companySchema),
      count: z.number()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let companies = (await createClient(ctx).listCompanies()).map(mapCompany);

    return {
      output: {
        companies,
        count: companies.length
      },
      message: `Found **${companies.length}** UniMicro companies.`
    };
  })
  .build();

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description:
    'List UniMicro customer master records for CRM, billing, accounting sync, and invoice lookup workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      customerNumber: z.number().int().optional().describe('Filter by CustomerNumber.'),
      organizationNumber: z.string().optional().describe('Filter by OrgNumber.'),
      statusCode: z.number().int().optional().describe('Filter by customer StatusCode.'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter with contains(Info.Name, value). Use raw filter if unsupported.')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('CustomerNumber', ctx.input.customerNumber),
      eqStringFilter('OrgNumber', ctx.input.organizationNumber),
      eqNumberFilter('StatusCode', ctx.input.statusCode),
      containsFilter('Info.Name', ctx.input.nameContains)
    );
    let customers = (await createClient(ctx).listCustomers(listQuery(ctx, filter))).map(
      mapCustomer
    );

    return {
      output: { customers, page: page(ctx, customers.length) },
      message: `Found **${customers.length}** UniMicro customers.`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: 'Get one UniMicro customer by numeric customer id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonGetInput,
      id: idInputSchema
    })
  )
  .output(
    z.object({
      customer: customerSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let customer = mapCustomer(
      await createClient(ctx).getCustomer(ctx.input.id, {
        expand: ctx.input.expand,
        select: ctx.input.select
      })
    );

    return {
      output: { customer },
      message: `Retrieved UniMicro customer **${ctx.input.id}**.`
    };
  })
  .build();

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description:
    'List UniMicro supplier master records for procurement, accounts payable, and supplier invoice workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      supplierNumber: z.number().int().optional().describe('Filter by SupplierNumber.'),
      organizationNumber: z.string().optional().describe('Filter by OrgNumber.'),
      statusCode: z.number().int().optional().describe('Filter by supplier StatusCode.'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter with contains(Info.Name, value). Use raw filter if unsupported.')
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('SupplierNumber', ctx.input.supplierNumber),
      eqStringFilter('OrgNumber', ctx.input.organizationNumber),
      eqNumberFilter('StatusCode', ctx.input.statusCode),
      containsFilter('Info.Name', ctx.input.nameContains)
    );
    let suppliers = (await createClient(ctx).listSuppliers(listQuery(ctx, filter))).map(
      mapSupplier
    );

    return {
      output: { suppliers, page: page(ctx, suppliers.length) },
      message: `Found **${suppliers.length}** UniMicro suppliers.`
    };
  })
  .build();

export let listCustomerInvoices = SlateTool.create(spec, {
  name: 'List Customer Invoices',
  key: 'list_customer_invoices',
  description:
    'List UniMicro customer invoices for AR visibility, customer invoice investigation, payment status review, and export workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      customerId: z.number().int().optional().describe('Filter by CustomerID.'),
      invoiceNumber: z.string().optional().describe('Filter by InvoiceNumber.'),
      statusCode: z.number().int().optional().describe('Filter by invoice StatusCode.'),
      invoiceDateFrom: z.string().optional().describe('Filter InvoiceDate greater/equal.'),
      invoiceDateTo: z.string().optional().describe('Filter InvoiceDate less/equal.'),
      paymentDueDateFrom: z
        .string()
        .optional()
        .describe('Filter PaymentDueDate greater/equal.'),
      paymentDueDateTo: z.string().optional().describe('Filter PaymentDueDate less/equal.')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('CustomerID', ctx.input.customerId),
      eqStringFilter('InvoiceNumber', ctx.input.invoiceNumber),
      eqNumberFilter('StatusCode', ctx.input.statusCode),
      dateRangeFilter('InvoiceDate', ctx.input.invoiceDateFrom, ctx.input.invoiceDateTo),
      dateRangeFilter(
        'PaymentDueDate',
        ctx.input.paymentDueDateFrom,
        ctx.input.paymentDueDateTo
      )
    );
    let invoices = (await createClient(ctx).listCustomerInvoices(listQuery(ctx, filter))).map(
      mapInvoice
    );

    return {
      output: { invoices, page: page(ctx, invoices.length) },
      message: `Found **${invoices.length}** UniMicro customer invoices.`
    };
  })
  .build();

export let getCustomerInvoice = SlateTool.create(spec, {
  name: 'Get Customer Invoice',
  key: 'get_customer_invoice',
  description: 'Get one UniMicro customer invoice by numeric invoice id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonGetInput,
      id: idInputSchema
    })
  )
  .output(
    z.object({
      invoice: invoiceSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let invoice = mapInvoice(
      await createClient(ctx).getCustomerInvoice(ctx.input.id, {
        expand: ctx.input.expand,
        select: ctx.input.select
      })
    );

    return {
      output: { invoice },
      message: `Retrieved UniMicro customer invoice **${ctx.input.id}**.`
    };
  })
  .build();

export let listSupplierInvoices = SlateTool.create(spec, {
  name: 'List Supplier Invoices',
  key: 'list_supplier_invoices',
  description:
    'List UniMicro supplier invoices for AP visibility, approval state review, payment status review, and export workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      supplierId: z.number().int().optional().describe('Filter by SupplierID.'),
      invoiceNumber: z.string().optional().describe('Filter by InvoiceNumber.'),
      statusCode: z
        .number()
        .int()
        .optional()
        .describe('Filter by supplier invoice StatusCode.'),
      paymentStatus: z.number().int().optional().describe('Filter by PaymentStatus.'),
      invoiceDateFrom: z.string().optional().describe('Filter InvoiceDate greater/equal.'),
      invoiceDateTo: z.string().optional().describe('Filter InvoiceDate less/equal.'),
      paymentDueDateFrom: z
        .string()
        .optional()
        .describe('Filter PaymentDueDate greater/equal.'),
      paymentDueDateTo: z.string().optional().describe('Filter PaymentDueDate less/equal.')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('SupplierID', ctx.input.supplierId),
      eqStringFilter('InvoiceNumber', ctx.input.invoiceNumber),
      eqNumberFilter('StatusCode', ctx.input.statusCode),
      eqNumberFilter('PaymentStatus', ctx.input.paymentStatus),
      dateRangeFilter('InvoiceDate', ctx.input.invoiceDateFrom, ctx.input.invoiceDateTo),
      dateRangeFilter(
        'PaymentDueDate',
        ctx.input.paymentDueDateFrom,
        ctx.input.paymentDueDateTo
      )
    );
    let invoices = (await createClient(ctx).listSupplierInvoices(listQuery(ctx, filter))).map(
      mapInvoice
    );

    return {
      output: { invoices, page: page(ctx, invoices.length) },
      message: `Found **${invoices.length}** UniMicro supplier invoices.`
    };
  })
  .build();

export let getSupplierInvoice = SlateTool.create(spec, {
  name: 'Get Supplier Invoice',
  key: 'get_supplier_invoice',
  description: 'Get one UniMicro supplier invoice by numeric supplier invoice id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonGetInput,
      id: idInputSchema
    })
  )
  .output(
    z.object({
      invoice: invoiceSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let invoice = mapInvoice(
      await createClient(ctx).getSupplierInvoice(ctx.input.id, {
        expand: ctx.input.expand,
        select: ctx.input.select
      })
    );

    return {
      output: { invoice },
      message: `Retrieved UniMicro supplier invoice **${ctx.input.id}**.`
    };
  })
  .build();

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description:
    'List UniMicro products and services for invoice/order setup, product sync, pricing, VAT, and account mapping workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      partName: z.string().optional().describe('Filter by PartName/product number.'),
      externalProductNumber: z
        .string()
        .optional()
        .describe('Filter by ExternalProductNumber.'),
      accountId: z.number().int().optional().describe('Filter by AccountID.'),
      statusCode: z.number().int().optional().describe('Filter by product StatusCode.'),
      nameContains: z.string().optional().describe('Filter with contains(Name, value).')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqStringFilter('PartName', ctx.input.partName),
      eqStringFilter('ExternalProductNumber', ctx.input.externalProductNumber),
      eqNumberFilter('AccountID', ctx.input.accountId),
      eqNumberFilter('StatusCode', ctx.input.statusCode),
      containsFilter('Name', ctx.input.nameContains)
    );
    let products = (await createClient(ctx).listProducts(listQuery(ctx, filter))).map(
      mapProduct
    );

    return {
      output: { products, page: page(ctx, products.length) },
      message: `Found **${products.length}** UniMicro products.`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'List UniMicro chart of accounts records for accounting, invoice coding, journal, and reporting workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      accountNumber: z.number().int().optional().describe('Filter by AccountNumber.'),
      accountNameContains: z
        .string()
        .optional()
        .describe('Filter with contains(AccountName, value).'),
      active: z.boolean().optional().describe('Filter by Active.'),
      visible: z.boolean().optional().describe('Filter by Visible.'),
      systemAccount: z.boolean().optional().describe('Filter by SystemAccount.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('AccountNumber', ctx.input.accountNumber),
      containsFilter('AccountName', ctx.input.accountNameContains),
      ctx.input.active === undefined ? undefined : `Active eq ${ctx.input.active}`,
      ctx.input.visible === undefined ? undefined : `Visible eq ${ctx.input.visible}`,
      ctx.input.systemAccount === undefined
        ? undefined
        : `SystemAccount eq ${ctx.input.systemAccount}`
    );
    let accounts = (await createClient(ctx).listAccounts(listQuery(ctx, filter))).map(
      mapAccount
    );

    return {
      output: { accounts, page: page(ctx, accounts.length) },
      message: `Found **${accounts.length}** UniMicro accounts.`
    };
  })
  .build();

export let listJournalEntries = SlateTool.create(spec, {
  name: 'List Journal Entries',
  key: 'list_journal_entries',
  description:
    'List UniMicro journal entry headers for general ledger audit, voucher lookup, and accounting export workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      financialYearId: z.number().int().optional().describe('Filter by FinancialYearID.'),
      journalEntryNumber: z.string().optional().describe('Filter by JournalEntryNumber.'),
      statusCode: z.number().int().optional().describe('Filter by journal entry StatusCode.')
    })
  )
  .output(
    z.object({
      journalEntries: z.array(journalEntrySchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('FinancialYearID', ctx.input.financialYearId),
      eqStringFilter('JournalEntryNumber', ctx.input.journalEntryNumber),
      eqNumberFilter('StatusCode', ctx.input.statusCode)
    );
    let journalEntries = (
      await createClient(ctx).listJournalEntries(listQuery(ctx, filter))
    ).map(mapJournalEntry);

    return {
      output: { journalEntries, page: page(ctx, journalEntries.length) },
      message: `Found **${journalEntries.length}** UniMicro journal entries.`
    };
  })
  .build();

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'List UniMicro projects for dimensional reporting, invoice context, and project accounting workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...commonListInput,
      projectCustomerId: z.number().int().optional().describe('Filter by ProjectCustomerID.'),
      projectNumber: z.string().optional().describe('Filter by ProjectNumber.'),
      statusCode: z.number().int().optional().describe('Filter by project StatusCode.'),
      nameContains: z.string().optional().describe('Filter with contains(Name, value).')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema),
      page: pageInfoSchema
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let filter = combineFilters(
      deletedFilter(ctx.input.includeDeleted),
      updatedSinceFilter(ctx.input.updatedSince),
      eqNumberFilter('ProjectCustomerID', ctx.input.projectCustomerId),
      eqStringFilter('ProjectNumber', ctx.input.projectNumber),
      eqNumberFilter('StatusCode', ctx.input.statusCode),
      containsFilter('Name', ctx.input.nameContains)
    );
    let projects = (await createClient(ctx).listProjects(listQuery(ctx, filter))).map(
      mapProject
    );

    return {
      output: { projects, page: page(ctx, projects.length) },
      message: `Found **${projects.length}** UniMicro projects.`
    };
  })
  .build();

export let getProfitAndLoss = SlateTool.create(spec, {
  name: 'Get Profit And Loss',
  key: 'get_profit_and_loss',
  description:
    'Get the UniMicro profit-and-loss-periodical account report. The official Swagger exposes FinancialYear and SumAllYears query parameters for this action.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyKey: companyKeyInputSchema,
      financialYear: financialYearInput,
      sumAllYears: z
        .string()
        .optional()
        .describe(
          'UniMicro SumAllYears query parameter for this report action. Official Swagger documents this parameter as a string.'
        )
    })
  )
  .output(reportSchema)
  .handleInvocation(async (ctx: ToolContext) => {
    let report = await createClient(ctx).getProfitAndLoss({
      FinancialYear: ctx.input.financialYear,
      SumAllYears: ctx.input.sumAllYears
    });

    return {
      output: { report },
      message: 'Retrieved UniMicro profit and loss report.'
    };
  })
  .build();

export let getBalanceSheet = SlateTool.create(spec, {
  name: 'Get Balance Sheet',
  key: 'get_balance_sheet',
  description:
    'Get the UniMicro balance account report. The official Swagger exposes FinancialYear for this action.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyKey: companyKeyInputSchema,
      financialYear: financialYearInput
    })
  )
  .output(reportSchema)
  .handleInvocation(async (ctx: ToolContext) => {
    let report = await createClient(ctx).getBalanceSheet({
      FinancialYear: ctx.input.financialYear
    });

    return {
      output: { report },
      message: 'Retrieved UniMicro balance sheet report.'
    };
  })
  .build();

export let getTrialBalance = SlateTool.create(spec, {
  name: 'Get Trial Balance',
  key: 'get_trial_balance',
  description:
    'Get the UniMicro trialbalance account report. The official Swagger does not expose date parameters for this action, so use the raw report output as returned.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyKey: companyKeyInputSchema
    })
  )
  .output(reportSchema)
  .handleInvocation(async (ctx: ToolContext) => {
    let report = await createClient(ctx).getTrialBalance({});

    return {
      output: { report },
      message: 'Retrieved UniMicro trial balance report.'
    };
  })
  .build();

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Download a UniMicro file through the UniMicro Files endpoint and return the contents as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyKey: companyKeyInputSchema,
      fileId: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'UniMicro file metadata id. The tool reads StorageReference before download.'
        ),
      storageReference: z
        .string()
        .optional()
        .describe('UniMicro StorageReference to download directly from the Files endpoint.'),
      fileName: z.string().optional().describe('Attachment filename override.'),
      mimeType: z.string().optional().describe('Attachment MIME type override.')
    })
  )
  .output(
    z.object({
      fileId: z.number().optional(),
      storageReference: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      byteLength: z.number(),
      attachmentCount: z.number(),
      file: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    requireAtLeastOne(
      {
        fileId: ctx.input.fileId,
        storageReference: ctx.input.storageReference
      },
      'Provide fileId or storageReference.'
    );

    let download = await createClient(ctx).downloadFile({
      fileId: ctx.input.fileId,
      storageReference: ctx.input.storageReference,
      fileName: ctx.input.fileName,
      mimeType: ctx.input.mimeType
    });

    return {
      output: {
        fileId: ctx.input.fileId,
        storageReference: download.storageReference,
        fileName: download.fileName,
        mimeType: download.mimeType,
        byteLength: download.byteLength,
        attachmentCount: 1,
        file: download.file
      },
      message: `Downloaded UniMicro file **${download.fileName}**.`,
      attachments: [createBase64Attachment(download.contentBase64, download.mimeType)]
    };
  })
  .build();
