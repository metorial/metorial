import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  asRecord,
  booleanByKeys,
  booleanEqualsFilter,
  combineFilters,
  containsFilter,
  createClient,
  idFrom,
  listMetadata,
  listMetadataSchema,
  nameFrom,
  numberByKeys,
  numberEqualsFilter,
  queryInputShape,
  queryParams,
  rawRecordSchema,
  requireCompanyKey,
  stringByKeys,
  stringEqualsFilter
} from './shared';

let customerSchema = z.object({
  id: z.number().optional(),
  customerNumber: z.number().optional(),
  name: z.string().optional(),
  orgNumber: z.string().optional(),
  deleted: z.boolean().optional(),
  statusCode: z.number().optional(),
  raw: rawRecordSchema
});

let supplierSchema = z.object({
  id: z.number().optional(),
  supplierNumber: z.number().optional(),
  name: z.string().optional(),
  orgNumber: z.string().optional(),
  deleted: z.boolean().optional(),
  statusCode: z.number().optional(),
  preventPayments: z.boolean().optional(),
  raw: rawRecordSchema
});

let productSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  partName: z.string().optional(),
  externalProductNumber: z.string().optional(),
  unit: z.string().optional(),
  priceExVat: z.number().optional(),
  priceIncVat: z.number().optional(),
  accountId: z.number().optional(),
  vatTypeId: z.number().optional(),
  defaultProductCategoryId: z.number().optional(),
  deleted: z.boolean().optional(),
  statusCode: z.number().optional(),
  raw: rawRecordSchema
});

let accountSchema = z.object({
  id: z.number().optional(),
  accountId: z.number().optional(),
  accountNumber: z.number().optional(),
  accountName: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  accountGroupId: z.number().optional(),
  topLevelAccountGroupId: z.number().optional(),
  vatTypeId: z.number().optional(),
  statusCode: z.number().optional(),
  active: z.boolean().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  lockManualPosts: z.boolean().optional(),
  deleted: z.boolean().optional(),
  systemAccount: z.boolean().optional(),
  updatedAt: z.string().optional(),
  raw: rawRecordSchema
});

let projectSchema = z.object({
  id: z.number().optional(),
  projectNumber: z.string().optional(),
  name: z.string().optional(),
  projectCustomerId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  visible: z.boolean().optional(),
  deleted: z.boolean().optional(),
  statusCode: z.number().optional(),
  raw: rawRecordSchema
});

let mapCustomer = (value: unknown): z.infer<typeof customerSchema> => {
  let record = asRecord(value);
  return {
    id: idFrom(record),
    customerNumber: numberByKeys(record, ['CustomerNumber']),
    name: nameFrom(record),
    orgNumber: stringByKeys(record, ['OrgNumber', 'OrganizationNumber']),
    deleted: booleanByKeys(record, ['Deleted']),
    statusCode: numberByKeys(record, ['StatusCode']),
    raw: record
  };
};

let mapSupplier = (value: unknown): z.infer<typeof supplierSchema> => {
  let record = asRecord(value);
  return {
    id: idFrom(record),
    supplierNumber: numberByKeys(record, ['SupplierNumber']),
    name: nameFrom(record),
    orgNumber: stringByKeys(record, ['OrgNumber', 'OrganizationNumber']),
    deleted: booleanByKeys(record, ['Deleted']),
    statusCode: numberByKeys(record, ['StatusCode']),
    preventPayments: booleanByKeys(record, ['PreventSupplierInvoicePayments']),
    raw: record
  };
};

let mapProduct = (value: unknown): z.infer<typeof productSchema> => {
  let record = asRecord(value);
  return {
    id: idFrom(record),
    name: nameFrom(record),
    partName: stringByKeys(record, ['PartName']),
    externalProductNumber: stringByKeys(record, ['ExternalProductNumber']),
    unit: stringByKeys(record, ['Unit']),
    priceExVat: numberByKeys(record, ['PriceExVat']),
    priceIncVat: numberByKeys(record, ['PriceIncVat']),
    accountId: numberByKeys(record, ['AccountID']),
    vatTypeId: numberByKeys(record, ['VatTypeID']),
    defaultProductCategoryId: numberByKeys(record, ['DefaultProductCategoryID']),
    deleted: booleanByKeys(record, ['Deleted']),
    statusCode: numberByKeys(record, ['StatusCode']),
    raw: record
  };
};

let mapAccount = (value: unknown): z.infer<typeof accountSchema> => {
  let record = asRecord(value);
  let accountName = stringByKeys(record, ['AccountName', 'Name']);
  return {
    id: idFrom(record),
    accountId: numberByKeys(record, ['AccountID']),
    accountNumber: numberByKeys(record, ['AccountNumber']),
    accountName,
    name: accountName,
    description: stringByKeys(record, ['Description']),
    accountGroupId: numberByKeys(record, ['AccountGroupID']),
    topLevelAccountGroupId: numberByKeys(record, ['TopLevelAccountGroupID']),
    vatTypeId: numberByKeys(record, ['VatTypeID']),
    statusCode: numberByKeys(record, ['StatusCode']),
    active: booleanByKeys(record, ['Active']),
    visible: booleanByKeys(record, ['Visible']),
    locked: booleanByKeys(record, ['Locked']),
    lockManualPosts: booleanByKeys(record, ['LockManualPosts']),
    deleted: booleanByKeys(record, ['Deleted']),
    systemAccount: booleanByKeys(record, ['SystemAccount']),
    updatedAt: stringByKeys(record, ['UpdatedAt']),
    raw: record
  };
};

let mapProject = (value: unknown): z.infer<typeof projectSchema> => {
  let record = asRecord(value);
  return {
    id: idFrom(record),
    projectNumber: stringByKeys(record, ['ProjectNumber']),
    name: nameFrom(record),
    projectCustomerId: numberByKeys(record, ['ProjectCustomerID']),
    startDate: stringByKeys(record, ['StartDate', 'PlannedStartdate']),
    endDate: stringByKeys(record, ['EndDate', 'PlannedEnddate']),
    visible: booleanByKeys(record, ['Visible']),
    deleted: booleanByKeys(record, ['Deleted']),
    statusCode: numberByKeys(record, ['StatusCode']),
    raw: record
  };
};

let customerFilter = (input: {
  search?: string;
  orgNumber?: string;
  customerNumber?: number;
  statusCode?: number;
  deleted?: boolean;
}) =>
  combineFilters([
    containsFilter('Info.Name', input.search),
    stringEqualsFilter('OrgNumber', input.orgNumber),
    numberEqualsFilter('CustomerNumber', input.customerNumber),
    numberEqualsFilter('StatusCode', input.statusCode),
    booleanEqualsFilter('Deleted', input.deleted)
  ]);

let supplierFilter = (input: {
  search?: string;
  orgNumber?: string;
  supplierNumber?: number;
  statusCode?: number;
  deleted?: boolean;
}) =>
  combineFilters([
    containsFilter('Info.Name', input.search),
    stringEqualsFilter('OrgNumber', input.orgNumber),
    numberEqualsFilter('SupplierNumber', input.supplierNumber),
    numberEqualsFilter('StatusCode', input.statusCode),
    booleanEqualsFilter('Deleted', input.deleted)
  ]);

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description:
    'List SpareBank 1 Regnskap customers with optional organization number, customer number, status, deleted flag, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search customer business relation name.'),
      orgNumber: z.string().optional().describe('Customer organization number.'),
      customerNumber: z.number().int().positive().optional(),
      statusCode: z.number().int().optional(),
      deleted: z.boolean().optional(),
      ...queryInputShape
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let raw = await client.list(
      '/customers',
      queryParams(ctx.input, customerFilter(ctx.input)),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let customers = raw.map(mapCustomer);

    return {
      output: {
        customers,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${customers.length}** SpareBank 1 Regnskap customer(s).`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description:
    'Fetch one SpareBank 1 Regnskap customer by Unimicro customer ID, with optional select and expand.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().int().positive().describe('Unimicro customer ID.'),
      select: queryInputShape.select,
      expand: queryInputShape.expand,
      companyKey: queryInputShape.companyKey
    })
  )
  .output(z.object({ customer: customerSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let customer = mapCustomer(
      await client.get(
        `/customers/${ctx.input.customerId}`,
        queryParams(ctx.input),
        requireCompanyKey(ctx, ctx.input.companyKey)
      )
    );

    return {
      output: { customer },
      message: `Fetched SpareBank 1 Regnskap customer **${customer.name ?? customer.id ?? ctx.input.customerId}**.`
    };
  })
  .build();

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description:
    'List SpareBank 1 Regnskap suppliers with optional organization number, supplier number, status, deleted flag, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search supplier business relation name.'),
      orgNumber: z.string().optional().describe('Supplier organization number.'),
      supplierNumber: z.number().int().positive().optional(),
      statusCode: z.number().int().optional(),
      deleted: z.boolean().optional(),
      ...queryInputShape
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let raw = await client.list(
      '/suppliers',
      queryParams(ctx.input, supplierFilter(ctx.input)),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let suppliers = raw.map(mapSupplier);

    return {
      output: {
        suppliers,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${suppliers.length}** SpareBank 1 Regnskap supplier(s).`
    };
  })
  .build();

export let getSupplier = SlateTool.create(spec, {
  name: 'Get Supplier',
  key: 'get_supplier',
  description:
    'Fetch one SpareBank 1 Regnskap supplier by Unimicro supplier ID, with optional select and expand.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      supplierId: z.number().int().positive().describe('Unimicro supplier ID.'),
      select: queryInputShape.select,
      expand: queryInputShape.expand,
      companyKey: queryInputShape.companyKey
    })
  )
  .output(z.object({ supplier: supplierSchema }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let supplier = mapSupplier(
      await client.get(
        `/suppliers/${ctx.input.supplierId}`,
        queryParams(ctx.input),
        requireCompanyKey(ctx, ctx.input.companyKey)
      )
    );

    return {
      output: { supplier },
      message: `Fetched SpareBank 1 Regnskap supplier **${supplier.name ?? supplier.id ?? ctx.input.supplierId}**.`
    };
  })
  .build();

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description:
    'List SpareBank 1 Regnskap products with optional name, part number, account, VAT type, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search product name.'),
      partName: z.string().optional().describe('Product part number.'),
      externalProductNumber: z.string().optional().describe('External product number.'),
      accountId: z.number().int().positive().optional(),
      vatTypeId: z.number().int().positive().optional(),
      defaultProductCategoryId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Default product category ID.'),
      statusCode: z.number().int().optional().describe('Product status code.'),
      deleted: z.boolean().optional(),
      ...queryInputShape
    })
  )
  .output(
    z.object({
      products: z.array(productSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let generatedFilter = combineFilters([
      containsFilter('Name', ctx.input.search),
      stringEqualsFilter('PartName', ctx.input.partName),
      stringEqualsFilter('ExternalProductNumber', ctx.input.externalProductNumber),
      numberEqualsFilter('AccountID', ctx.input.accountId),
      numberEqualsFilter('VatTypeID', ctx.input.vatTypeId),
      numberEqualsFilter('DefaultProductCategoryID', ctx.input.defaultProductCategoryId),
      numberEqualsFilter('StatusCode', ctx.input.statusCode),
      booleanEqualsFilter('Deleted', ctx.input.deleted)
    ]);
    let raw = await client.list(
      '/products',
      queryParams(ctx.input, generatedFilter),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let products = raw.map(mapProduct);

    return {
      output: {
        products,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${products.length}** SpareBank 1 Regnskap product(s).`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'List SpareBank 1 Regnskap chart-of-account records with optional account number, name, active/deleted filters, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountNumber: z.number().int().positive().optional(),
      search: z.string().optional().describe('Search account name.'),
      active: z.boolean().optional(),
      visible: z.boolean().optional(),
      deleted: z.boolean().optional(),
      ...queryInputShape
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let generatedFilter = combineFilters([
      numberEqualsFilter('AccountNumber', ctx.input.accountNumber),
      containsFilter('AccountName', ctx.input.search),
      booleanEqualsFilter('Active', ctx.input.active),
      booleanEqualsFilter('Visible', ctx.input.visible),
      booleanEqualsFilter('Deleted', ctx.input.deleted)
    ]);
    let raw = await client.list(
      '/accounts',
      queryParams(ctx.input, generatedFilter),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let accounts = raw.map(mapAccount);

    return {
      output: {
        accounts,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${accounts.length}** SpareBank 1 Regnskap account(s).`
    };
  })
  .build();

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'List SpareBank 1 Regnskap projects with optional project number, name, customer, deleted/visible filters, Unimicro filter/select/expand, and pagination.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search project name.'),
      projectNumber: z.string().optional(),
      projectCustomerId: z.number().int().positive().optional(),
      visible: z.boolean().optional(),
      deleted: z.boolean().optional(),
      ...queryInputShape
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let generatedFilter = combineFilters([
      containsFilter('Name', ctx.input.search),
      stringEqualsFilter('ProjectNumber', ctx.input.projectNumber),
      numberEqualsFilter('ProjectCustomerID', ctx.input.projectCustomerId),
      booleanEqualsFilter('Visible', ctx.input.visible),
      booleanEqualsFilter('Deleted', ctx.input.deleted)
    ]);
    let raw = await client.list(
      '/projects',
      queryParams(ctx.input, generatedFilter),
      requireCompanyKey(ctx, ctx.input.companyKey)
    );
    let projects = raw.map(mapProject);

    return {
      output: {
        projects,
        ...listMetadata(raw, ctx.input)
      },
      message: `Found **${projects.length}** SpareBank 1 Regnskap project(s).`
    };
  })
  .build();
