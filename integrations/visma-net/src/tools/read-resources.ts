import { SlateTool } from 'slates';
import { z } from 'zod';
import { vismaNetServiceError } from '../lib/errors';
import {
  accountSummarySchema,
  backgroundOperationSchema,
  customerSummarySchema,
  inventoryItemSummarySchema,
  invoiceSummarySchema,
  mapAccount,
  mapCustomer,
  mapCustomerInvoice,
  mapInventoryItem,
  mapProject,
  mapSalesOrder,
  mapSupplier,
  mapSupplierInvoice,
  projectSummarySchema,
  salesOrderSummarySchema,
  supplierSummarySchema
} from '../lib/mapping';
import { vismaNetActionScopes } from '../scopes';
import { spec } from '../spec';
import { createVismaNetClient } from './context';

let backgroundModeSchema = z
  .enum(['sync', 'background'])
  .optional()
  .describe(
    'Use "background" to ask Visma to queue the request with erp-api-background=none.'
  );

let modifiedConditionSchema = z
  .enum(['>', '<', '>=', '<='])
  .optional()
  .describe(
    'Condition for the paired date-time field. Provide this together with that field.'
  );

let pageNumberSchema = z.number().int().min(1).optional().describe('Page number.');
let pageSizeSchema = z
  .number()
  .int()
  .min(1)
  .max(500)
  .optional()
  .describe('Page size. Visma may lower this to the endpoint metadata max page size.');

type ToolContext = {
  auth: {
    token: string;
    tenantId?: string;
  };
  config: {
    tenantId: string;
    defaultBranch?: string;
    defaultPageSize?: number;
  };
  input: Record<string, any>;
};

let createClient = (ctx: ToolContext) => createVismaNetClient(ctx);

let validateDateConditionPair = (
  input: Record<string, unknown>,
  dateField: string,
  conditionField: string
) => {
  let hasDate = input[dateField] !== undefined;
  let hasCondition = input[conditionField] !== undefined;

  if (hasDate !== hasCondition) {
    throw vismaNetServiceError(
      `${dateField} and ${conditionField} must be provided together.`
    );
  }
};

let paginationParams = (ctx: ToolContext) => ({
  pageNumber: ctx.input.pageNumber,
  pageSize: ctx.input.pageSize ?? ctx.config.defaultPageSize ?? 100
});

let backgroundOptions = (ctx: ToolContext) => ({
  backgroundMode: ctx.input.backgroundMode
});

let branchValue = (ctx: ToolContext) => ctx.input.branch ?? ctx.config.defaultBranch;

let requireArrayData = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw vismaNetServiceError(`Visma Net did not return a list for ${label}.`);
  }
  return value;
};

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description:
    'List Visma Net customers for AR/customer sync. Supports status, identity/contact filters, modified-since filters, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      name: z.string().optional().describe('Filter by customer name.'),
      status: z
        .enum(['Active', 'OnHold', 'CreditHold', 'Inactive', 'OneTime'])
        .optional()
        .describe('Customer status filter.'),
      corporateId: z.string().optional().describe('Filter by corporate ID.'),
      vatRegistrationId: z.string().optional().describe('Filter by VAT registration ID.'),
      email: z.string().optional().describe('Filter by email.'),
      phone: z.string().optional().describe('Filter by phone.'),
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      customers: z.array(customerSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listCustomers(
      {
        name: ctx.input.name,
        status: ctx.input.status,
        corporateId: ctx.input.corporateId,
        vatRegistrationId: ctx.input.vatRegistrationId,
        email: ctx.input.email,
        phone: ctx.input.phone,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { customers: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net customer list request as a background operation.'
      };
    }

    let customers = requireArrayData(result.data, 'customers').map(value =>
      mapCustomer(value)
    );
    return {
      output: { customers, count: customers.length },
      message: `Found **${customers.length}** Visma Net customers.`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: 'Get one Visma Net customer by customer code.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      customerCd: z.string().describe('Visma Net customer code.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      customer: customerSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getCustomer(
      ctx.input.customerCd,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net customer **${ctx.input.customerCd}** lookup as a background operation.`
      };
    }

    return {
      output: { customer: mapCustomer(result.data, result.eTag) },
      message: `Retrieved Visma Net customer **${ctx.input.customerCd}**.`
    };
  })
  .build();

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description:
    'List Visma Net suppliers for AP/procurement workflows. Supports status, identity filters, modified-since filters, ordering, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      name: z.string().optional().describe('Filter by supplier name.'),
      status: z
        .enum(['Active', 'OnHold', 'HoldPayments', 'Inactive', 'OneTime'])
        .optional()
        .describe('Supplier status filter.'),
      corporateId: z.string().optional().describe('Filter by corporate ID.'),
      vatRegistrationId: z.string().optional().describe('Filter by VAT registration ID.'),
      orderBy: z.string().optional().describe('Visma orderBy value for supplier list.'),
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listSuppliers(
      {
        name: ctx.input.name,
        status: ctx.input.status,
        corporateId: ctx.input.corporateId,
        vatRegistrationId: ctx.input.vatRegistrationId,
        orderBy: ctx.input.orderBy,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { suppliers: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net supplier list request as a background operation.'
      };
    }

    let suppliers = requireArrayData(result.data, 'suppliers').map(value =>
      mapSupplier(value)
    );
    return {
      output: { suppliers, count: suppliers.length },
      message: `Found **${suppliers.length}** Visma Net suppliers.`
    };
  })
  .build();

export let getSupplier = SlateTool.create(spec, {
  name: 'Get Supplier',
  key: 'get_supplier',
  description: 'Get one Visma Net supplier by supplier code.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      supplierCd: z.string().describe('Visma Net supplier code.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      supplier: supplierSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getSupplier(
      ctx.input.supplierCd,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net supplier **${ctx.input.supplierCd}** lookup as a background operation.`
      };
    }

    return {
      output: { supplier: mapSupplier(result.data, result.eTag) },
      message: `Retrieved Visma Net supplier **${ctx.input.supplierCd}**.`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'List Visma Net general ledger accounts for posting, reporting, and validation workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      active: z.boolean().optional().describe('Filter by active account status.'),
      includeAccountClassDescription: z
        .boolean()
        .optional()
        .describe('Include account class descriptions when Visma supports it.'),
      publicCode: z.string().optional().describe('Filter by public reporting code.'),
      externalCode1: z.string().optional().describe('Filter by external code 1.'),
      externalCode2: z.string().optional().describe('Filter by external code 2.'),
      analysisCode: z.string().optional().describe('Filter by analysis code.'),
      greaterThanValue: z
        .string()
        .optional()
        .describe('Return accounts greater than this code.'),
      numberToRead: z.number().int().min(1).max(500).optional().describe('Legacy page size.'),
      skipRecords: z.number().int().min(0).optional().describe('Legacy offset.'),
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listAccounts(
      {
        active: ctx.input.active,
        includeAccountClassDescription: ctx.input.includeAccountClassDescription,
        publicCode: ctx.input.publicCode,
        externalCode1: ctx.input.externalCode1,
        externalCode2: ctx.input.externalCode2,
        analysisCode: ctx.input.analysisCode,
        greaterThanValue: ctx.input.greaterThanValue,
        numberToRead: ctx.input.numberToRead ?? ctx.config.defaultPageSize ?? 100,
        skipRecords: ctx.input.skipRecords,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { accounts: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net account list request as a background operation.'
      };
    }

    let accounts = requireArrayData(result.data, 'accounts').map(value => mapAccount(value));
    return {
      output: { accounts, count: accounts.length },
      message: `Found **${accounts.length}** Visma Net accounts.`
    };
  })
  .build();

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: 'Get one Visma Net general ledger account by account code.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      accountCd: z.string().describe('Visma Net account code.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      account: accountSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getAccount(
      ctx.input.accountCd,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net account **${ctx.input.accountCd}** lookup as a background operation.`
      };
    }

    return {
      output: { account: mapAccount(result.data, result.eTag) },
      message: `Retrieved Visma Net account **${ctx.input.accountCd}**.`
    };
  })
  .build();

export let listCustomerInvoices = SlateTool.create(spec, {
  name: 'List Customer Invoices',
  key: 'list_customer_invoices',
  description:
    'List Visma Net customer invoices for AR workflows. Supports customer, status, document type, date, branch, modified-since, attachment expansion, and pagination filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      customer: z.string().optional().describe('Customer code filter.'),
      documentType: z
        .enum(['Invoice', 'DebitNote', 'CreditNote', 'Payment', 'Prepayment', 'Refund'])
        .optional()
        .describe('Customer invoice document type filter.'),
      status: z
        .enum([
          'Hold',
          'Balanced',
          'Voided',
          'Scheduled',
          'Open',
          'Closed',
          'PendingPrint',
          'PendingEmail',
          'CreditHold',
          'CcHold',
          'Reserved'
        ])
        .optional()
        .describe('Customer invoice status filter.'),
      branch: z.string().optional().describe('Branch code. Defaults to integration config.'),
      documentDate: z.string().optional().describe('Document date filter.'),
      documentDateCondition: modifiedConditionSchema,
      documentDueDate: z.string().optional().describe('Document due date filter.'),
      documentDueDateCondition: modifiedConditionSchema,
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      expandAttachments: z.boolean().optional().describe('Include attachment references.'),
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(ctx.input, 'documentDate', 'documentDateCondition');
    validateDateConditionPair(ctx.input, 'documentDueDate', 'documentDueDateCondition');
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listCustomerInvoices(
      {
        customer: ctx.input.customer,
        documentType: ctx.input.documentType,
        status: ctx.input.status,
        branch: branchValue(ctx),
        documentDate: ctx.input.documentDate,
        documentDateCondition: ctx.input.documentDateCondition,
        documentDueDate: ctx.input.documentDueDate,
        documentDueDateCondition: ctx.input.documentDueDateCondition,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        expandAttachments: ctx.input.expandAttachments,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { invoices: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net customer invoice list request as a background operation.'
      };
    }

    let invoices = requireArrayData(result.data, 'customer invoices').map(value =>
      mapCustomerInvoice(value)
    );
    return {
      output: { invoices, count: invoices.length },
      message: `Found **${invoices.length}** Visma Net customer invoices.`
    };
  })
  .build();

export let getCustomerInvoice = SlateTool.create(spec, {
  name: 'Get Customer Invoice',
  key: 'get_customer_invoice',
  description: 'Get one Visma Net customer invoice by invoice number.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      invoiceNumber: z.string().describe('Visma Net customer invoice number.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      invoice: invoiceSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getCustomerInvoice(
      ctx.input.invoiceNumber,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net customer invoice **${ctx.input.invoiceNumber}** lookup as a background operation.`
      };
    }

    return {
      output: { invoice: mapCustomerInvoice(result.data, result.eTag) },
      message: `Retrieved Visma Net customer invoice **${ctx.input.invoiceNumber}**.`
    };
  })
  .build();

export let listSupplierInvoices = SlateTool.create(spec, {
  name: 'List Supplier Invoices',
  key: 'list_supplier_invoices',
  description:
    'List Visma Net supplier invoices for AP workflows. Supports supplier, status, document type, date, branch, modified-since, approval/attachment expansion, and pagination filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      supplier: z.string().optional().describe('Supplier code filter.'),
      documentType: z
        .enum(['Invoice', 'CreditAdj', 'DebitAdj', 'Prepayment', 'Refund', 'Payment'])
        .optional()
        .describe('Supplier invoice document type filter.'),
      status: z
        .enum([
          'Hold',
          'Balanced',
          'Voided',
          'Scheduled',
          'Open',
          'Closed',
          'Printed',
          'Prebooked',
          'Reserved'
        ])
        .optional()
        .describe('Supplier invoice status filter.'),
      branch: z.string().optional().describe('Branch code. Defaults to integration config.'),
      docDate: z.string().optional().describe('Document date filter.'),
      docDateCondition: modifiedConditionSchema,
      dueDate: z.string().optional().describe('Due date filter.'),
      dueDateCondition: modifiedConditionSchema,
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      expandAttachment: z.boolean().optional().describe('Include attachment references.'),
      expandApproval: z.boolean().optional().describe('Include approval details.'),
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(ctx.input, 'docDate', 'docDateCondition');
    validateDateConditionPair(ctx.input, 'dueDate', 'dueDateCondition');
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listSupplierInvoices(
      {
        supplier: ctx.input.supplier,
        documentType: ctx.input.documentType,
        status: ctx.input.status,
        branch: branchValue(ctx),
        docDate: ctx.input.docDate,
        docDateCondition: ctx.input.docDateCondition,
        dueDate: ctx.input.dueDate,
        dueDateCondition: ctx.input.dueDateCondition,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        expandAttachment: ctx.input.expandAttachment,
        expandApproval: ctx.input.expandApproval,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { invoices: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net supplier invoice list request as a background operation.'
      };
    }

    let invoices = requireArrayData(result.data, 'supplier invoices').map(value =>
      mapSupplierInvoice(value)
    );
    return {
      output: { invoices, count: invoices.length },
      message: `Found **${invoices.length}** Visma Net supplier invoices.`
    };
  })
  .build();

export let getSupplierInvoice = SlateTool.create(spec, {
  name: 'Get Supplier Invoice',
  key: 'get_supplier_invoice',
  description:
    'Get one Visma Net supplier invoice by invoice number. Provide documentType for credit adjustments, debit adjustments, prepayments, refunds, or payments.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      invoiceNumber: z.string().describe('Visma Net supplier invoice number.'),
      documentType: z
        .enum(['Invoice', 'CreditAdj', 'DebitAdj', 'Prepayment', 'Refund', 'Payment'])
        .optional()
        .describe('Document type. Omit for the standard invoice endpoint.'),
      expandLinePrebookAccounts: z.boolean().optional().describe('Include prebook accounts.'),
      expandLandedCosts: z.boolean().optional().describe('Include landed cost details.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      invoice: invoiceSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getSupplierInvoice(
      ctx.input.invoiceNumber,
      ctx.input.documentType,
      {
        expandLinePrebookAccounts: ctx.input.expandLinePrebookAccounts,
        expandLandedCosts: ctx.input.expandLandedCosts
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net supplier invoice **${ctx.input.invoiceNumber}** lookup as a background operation.`
      };
    }

    return {
      output: { invoice: mapSupplierInvoice(result.data, result.eTag) },
      message: `Retrieved Visma Net supplier invoice **${ctx.input.invoiceNumber}**.`
    };
  })
  .build();

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'List Visma Net projects for project accounting context. Supports status, branch, modified-since, and pagination filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      status: z
        .enum(['Planned', 'Active', 'Completed', 'Cancelled', 'OnHold', 'PendingApproval'])
        .optional()
        .describe('Project status filter.'),
      branch: z.string().optional().describe('Branch code. Defaults to integration config.'),
      nonProject: z
        .boolean()
        .optional()
        .describe('Whether to include/filter non-project rows.'),
      onHold: z.boolean().optional().describe('Filter by hold state.'),
      publicId: z.string().optional().describe('Project public UUID filter.'),
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      projects: z.array(projectSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listProjects(
      {
        status: ctx.input.status,
        branch: branchValue(ctx),
        nonProject: ctx.input.nonProject,
        onHold: ctx.input.onHold,
        publicId: ctx.input.publicId,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { projects: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net project list request as a background operation.'
      };
    }

    let projects = requireArrayData(result.data, 'projects').map(value => mapProject(value));
    return {
      output: { projects, count: projects.length },
      message: `Found **${projects.length}** Visma Net projects.`
    };
  })
  .build();

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: 'Get one Visma Net project by project ID/code.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      projectId: z.string().describe('Visma Net project ID/code.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      project: projectSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getProject(
      ctx.input.projectId,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net project **${ctx.input.projectId}** lookup as a background operation.`
      };
    }

    return {
      output: { project: mapProject(result.data, result.eTag) },
      message: `Retrieved Visma Net project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let listInventoryItems = SlateTool.create(spec, {
  name: 'List Inventory Items',
  key: 'list_inventory_items',
  description:
    'List Visma Net inventory items for sales, purchase, and logistics workflows. Supports item/status filters, modified-since filters, optional attachment expansion, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      inventoryNumber: z.string().optional().describe('Inventory number filter.'),
      alternateID: z.string().optional().describe('Alternate item ID filter.'),
      description: z.string().optional().describe('Description filter.'),
      status: z
        .enum([
          'Active',
          'NoSales',
          'NoPurchases',
          'NoRequest',
          'Inactive',
          'MarkedForDeletion'
        ])
        .optional()
        .describe('Inventory item status filter.'),
      inventoryTypes: z
        .array(z.string())
        .optional()
        .describe('Inventory type filters, passed to Visma as inventoryTypes.'),
      expandAttachment: z.boolean().optional().describe('Include attachment references.'),
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      items: z.array(inventoryItemSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listInventoryItems(
      {
        inventoryNumber: ctx.input.inventoryNumber,
        alternateID: ctx.input.alternateID,
        description: ctx.input.description,
        status: ctx.input.status,
        inventoryTypes: ctx.input.inventoryTypes,
        expandAttachment: ctx.input.expandAttachment,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { items: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net inventory list request as a background operation.'
      };
    }

    let items = requireArrayData(result.data, 'inventory items').map(value =>
      mapInventoryItem(value)
    );
    return {
      output: { items, count: items.length },
      message: `Found **${items.length}** Visma Net inventory items.`
    };
  })
  .build();

export let getInventoryItem = SlateTool.create(spec, {
  name: 'Get Inventory Item',
  key: 'get_inventory_item',
  description: 'Get one Visma Net inventory item by inventory number.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      inventoryNumber: z.string().describe('Visma Net inventory number.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      item: inventoryItemSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getInventoryItem(
      ctx.input.inventoryNumber,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net inventory item **${ctx.input.inventoryNumber}** lookup as a background operation.`
      };
    }

    return {
      output: { item: mapInventoryItem(result.data, result.eTag) },
      message: `Retrieved Visma Net inventory item **${ctx.input.inventoryNumber}**.`
    };
  })
  .build();

export let listSalesOrders = SlateTool.create(spec, {
  name: 'List Sales Orders',
  key: 'list_sales_orders',
  description:
    'List Visma Net sales orders for order fulfillment and customer order review. Supports order type, status, modified-since, notes, and pagination filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      orderType: z.string().optional().describe('Sales order type filter.'),
      status: z
        .enum([
          'Open',
          'Hold',
          'CreditHold',
          'Completed',
          'Cancelled',
          'BackOrder',
          'Shipping',
          'Invoiced',
          'PendingApproval',
          'Voided'
        ])
        .optional()
        .describe('Sales order status filter.'),
      showNotes: z.boolean().optional().describe('Include notes when Visma supports it.'),
      lastModifiedDateTime: z.string().optional().describe('Modified timestamp filter.'),
      lastModifiedDateTimeCondition: modifiedConditionSchema,
      pageNumber: pageNumberSchema,
      pageSize: pageSizeSchema,
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      orders: z.array(salesOrderSummarySchema),
      count: z.number(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    validateDateConditionPair(
      ctx.input,
      'lastModifiedDateTime',
      'lastModifiedDateTimeCondition'
    );

    let result = await createClient(ctx).listSalesOrders(
      {
        orderType: ctx.input.orderType,
        status: ctx.input.status,
        showNotes: ctx.input.showNotes,
        lastModifiedDateTime: ctx.input.lastModifiedDateTime,
        lastModifiedDateTimeCondition: ctx.input.lastModifiedDateTimeCondition,
        ...paginationParams(ctx)
      },
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { orders: [], count: 0, backgroundOperation: result.backgroundOperation },
        message: 'Queued Visma Net sales order list request as a background operation.'
      };
    }

    let orders = requireArrayData(result.data, 'sales orders').map(value =>
      mapSalesOrder(value)
    );
    return {
      output: { orders, count: orders.length },
      message: `Found **${orders.length}** Visma Net sales orders.`
    };
  })
  .build();

export let getSalesOrder = SlateTool.create(spec, {
  name: 'Get Sales Order',
  key: 'get_sales_order',
  description: 'Get one Visma Net sales order by order number.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(vismaNetActionScopes.read)
  .input(
    z.object({
      orderNumber: z.string().describe('Visma Net sales order number.'),
      backgroundMode: backgroundModeSchema
    })
  )
  .output(
    z.object({
      order: salesOrderSummarySchema.optional(),
      backgroundOperation: backgroundOperationSchema.optional()
    })
  )
  .handleInvocation(async (ctx: ToolContext) => {
    let result = await createClient(ctx).getSalesOrder(
      ctx.input.orderNumber,
      backgroundOptions(ctx)
    );

    if (result.backgroundOperation) {
      return {
        output: { backgroundOperation: result.backgroundOperation },
        message: `Queued Visma Net sales order **${ctx.input.orderNumber}** lookup as a background operation.`
      };
    }

    return {
      output: { order: mapSalesOrder(result.data, result.eTag) },
      message: `Retrieved Visma Net sales order **${ctx.input.orderNumber}**.`
    };
  })
  .build();
