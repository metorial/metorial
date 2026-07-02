import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { tripletexValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  addressBody,
  addressSchema,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  commonParams,
  companyIdFor,
  createClient,
  ensureCreateName,
  ensureUpdatePayload,
  entityName,
  listMetadataSchema,
  listOutput,
  pagingInputShape,
  rawRecordSchema,
  ref
} from './shared';

let customerSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  customerNumber: z.number().optional(),
  organizationNumber: z.string().optional(),
  email: z.string().optional(),
  invoiceEmail: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneNumberMobile: z.string().optional(),
  isInactive: z.boolean().optional(),
  raw: rawRecordSchema
});

let supplierSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  supplierNumber: z.number().optional(),
  organizationNumber: z.string().optional(),
  email: z.string().optional(),
  invoiceEmail: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneNumberMobile: z.string().optional(),
  isInactive: z.boolean().optional(),
  raw: rawRecordSchema
});

let contactSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  email: z.string().optional(),
  phoneNumberMobile: z.string().optional(),
  phoneNumberWork: z.string().optional(),
  customerId: z.number().optional(),
  departmentId: z.number().optional(),
  isInactive: z.boolean().optional(),
  raw: rawRecordSchema
});

let employeeSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  employeeNumber: z.string().optional(),
  email: z.string().optional(),
  departmentId: z.number().optional(),
  hasSystemAccess: z.boolean().optional(),
  raw: rawRecordSchema
});

let productSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  name: z.string().optional(),
  number: z.string().optional(),
  displayNumber: z.string().optional(),
  ean: z.string().optional(),
  priceExcludingVatCurrency: z.number().optional(),
  priceIncludingVatCurrency: z.number().optional(),
  costExcludingVatCurrency: z.number().optional(),
  isInactive: z.boolean().optional(),
  isStockItem: z.boolean().optional(),
  raw: rawRecordSchema
});

let projectSchema = z.object({
  id: z.number().optional(),
  version: z.number().optional(),
  name: z.string().optional(),
  number: z.string().optional(),
  displayName: z.string().optional(),
  customerId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isClosed: z.boolean().optional(),
  isOffer: z.boolean().optional(),
  isFixedPrice: z.boolean().optional(),
  raw: rawRecordSchema
});

let mapCustomer = (value: unknown): z.infer<typeof customerSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    name: asString(record.name),
    displayName: asString(record.displayName),
    customerNumber: asNumber(record.customerNumber),
    organizationNumber: asString(record.organizationNumber),
    email: asString(record.email),
    invoiceEmail: asString(record.invoiceEmail),
    phoneNumber: asString(record.phoneNumber),
    phoneNumberMobile: asString(record.phoneNumberMobile),
    isInactive: asBoolean(record.isInactive),
    raw: record
  };
};

let mapSupplier = (value: unknown): z.infer<typeof supplierSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    name: asString(record.name),
    displayName: asString(record.displayName),
    supplierNumber: asNumber(record.supplierNumber),
    organizationNumber: asString(record.organizationNumber),
    email: asString(record.email),
    invoiceEmail: asString(record.invoiceEmail),
    phoneNumber: asString(record.phoneNumber),
    phoneNumberMobile: asString(record.phoneNumberMobile),
    isInactive: asBoolean(record.isInactive),
    raw: record
  };
};

let mapContact = (value: unknown): z.infer<typeof contactSchema> => {
  let record = asRecord(value);
  let customer = asRecord(record.customer);
  let department = asRecord(record.department);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    firstName: asString(record.firstName),
    lastName: asString(record.lastName),
    displayName: asString(record.displayName),
    email: asString(record.email),
    phoneNumberMobile: asString(record.phoneNumberMobile),
    phoneNumberWork: asString(record.phoneNumberWork),
    customerId: asNumber(customer.id),
    departmentId: asNumber(department.id),
    isInactive: asBoolean(record.isInactive),
    raw: record
  };
};

let mapEmployee = (value: unknown): z.infer<typeof employeeSchema> => {
  let record = asRecord(value);
  let department = asRecord(record.department);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    firstName: asString(record.firstName),
    lastName: asString(record.lastName),
    displayName: asString(record.displayName),
    employeeNumber: asString(record.employeeNumber),
    email: asString(record.email),
    departmentId: asNumber(department.id),
    hasSystemAccess: asBoolean(record.hasSystemAccess),
    raw: record
  };
};

let mapProduct = (value: unknown): z.infer<typeof productSchema> => {
  let record = asRecord(value);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    name: asString(record.name),
    number: asString(record.number),
    displayNumber: asString(record.displayNumber),
    ean: asString(record.ean),
    priceExcludingVatCurrency: asNumber(record.priceExcludingVatCurrency),
    priceIncludingVatCurrency: asNumber(record.priceIncludingVatCurrency),
    costExcludingVatCurrency: asNumber(record.costExcludingVatCurrency),
    isInactive: asBoolean(record.isInactive),
    isStockItem: asBoolean(record.isStockItem),
    raw: record
  };
};

let mapProject = (value: unknown): z.infer<typeof projectSchema> => {
  let record = asRecord(value);
  let customer = asRecord(record.customer);
  return {
    id: asNumber(record.id),
    version: asNumber(record.version),
    name: asString(record.name),
    number: asString(record.number),
    displayName: asString(record.displayName),
    customerId: asNumber(customer.id),
    startDate: asString(record.startDate),
    endDate: asString(record.endDate),
    isClosed: asBoolean(record.isClosed),
    isOffer: asBoolean(record.isOffer),
    isFixedPrice: asBoolean(record.isFixedPrice),
    raw: record
  };
};

let baseBusinessInputShape = {
  id: z.number().int().positive().optional().describe('Record id. Provide to update.'),
  version: z
    .number()
    .int()
    .optional()
    .describe('Tripletex version for optimistic concurrency when updating.'),
  name: z.string().optional().describe('Record name. Required when creating.'),
  organizationNumber: z.string().optional(),
  email: z.string().optional(),
  invoiceEmail: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneNumberMobile: z.string().optional(),
  description: z.string().optional(),
  isInactive: z.boolean().optional(),
  language: z.enum(['NO', 'EN']).optional(),
  website: z.string().optional(),
  accountManagerId: z.number().int().positive().optional(),
  departmentId: z.number().int().positive().optional(),
  currencyId: z.number().int().positive().optional(),
  ledgerAccountId: z.number().int().positive().optional(),
  category1Id: z.number().int().positive().optional(),
  category2Id: z.number().int().positive().optional(),
  category3Id: z.number().int().positive().optional(),
  postalAddress: addressSchema,
  physicalAddress: addressSchema,
  deliveryAddress: addressSchema,
  fields: pagingInputShape.fields,
  companyId: pagingInputShape.companyId
};

let businessBody = (input: typeof baseBusinessInputShape extends infer _T ? any : never) =>
  pickDefined({
    id: input.id,
    version: input.version,
    name: input.name,
    organizationNumber: input.organizationNumber,
    email: input.email,
    invoiceEmail: input.invoiceEmail,
    phoneNumber: input.phoneNumber,
    phoneNumberMobile: input.phoneNumberMobile,
    description: input.description,
    isInactive: input.isInactive,
    language: input.language,
    website: input.website,
    accountManager: ref(input.accountManagerId),
    department: ref(input.departmentId),
    currency: ref(input.currencyId),
    ledgerAccount: ref(input.ledgerAccountId),
    category1: ref(input.category1Id),
    category2: ref(input.category2Id),
    category3: ref(input.category3Id),
    postalAddress: addressBody(input.postalAddress),
    physicalAddress: addressBody(input.physicalAddress),
    deliveryAddress: addressBody(input.deliveryAddress)
  });

let ensureCreateContactIdentity = (input: {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}) => {
  if (input.id !== undefined) return;
  if (input.firstName?.trim() || input.lastName?.trim() || input.email?.trim()) return;

  throw tripletexValidationError(
    'firstName, lastName, or email is required when creating a contact.'
  );
};

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description:
    'List Tripletex customers with filters for ids, account numbers, organization number, email, active state, changed-since timestamp, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated customer ids'),
      customerAccountNumber: z
        .string()
        .optional()
        .describe('Comma-separated customer account numbers'),
      organizationNumber: z.string().optional(),
      email: z.string().optional(),
      invoiceEmail: z.string().optional(),
      customerName: z.string().optional().describe('Customer name filter'),
      phoneNumberMobile: z.string().optional(),
      isInactive: z.boolean().optional(),
      accountManagerId: z.string().optional().describe('Comma-separated account manager ids'),
      changedSince: z.string().optional().describe('Only records changed since this datetime'),
      ...pagingInputShape
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
    let response = await client.list(
      '/customer',
      pickDefined({
        ...commonParams(ctx.input),
        id: ctx.input.id,
        customerAccountNumber: ctx.input.customerAccountNumber,
        organizationNumber: ctx.input.organizationNumber,
        email: ctx.input.email,
        invoiceEmail: ctx.input.invoiceEmail,
        customerName: ctx.input.customerName,
        phoneNumberMobile: ctx.input.phoneNumberMobile,
        isInactive: ctx.input.isInactive,
        accountManagerId: ctx.input.accountManagerId,
        changedSince: ctx.input.changedSince
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let customers = (response.values ?? []).map(mapCustomer);
    return {
      output: { customers, ...listOutput(response) },
      message: `Found **${customers.length}** Tripletex customer(s).`
    };
  })
  .build();

export let upsertCustomer = SlateTool.create(spec, {
  name: 'Upsert Customer',
  key: 'upsert_customer',
  description:
    'Create or update a Tripletex customer. Provide id to update an existing customer; omit id to create a customer.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...baseBusinessInputShape,
      customerNumber: z.number().int().positive().optional(),
      invoiceSendMethod: z
        .enum(['EMAIL', 'EHF', 'EFAKTURA', 'AVTALEGIRO', 'VIPPS', 'PAPER', 'MANUAL'])
        .optional(),
      emailAttachmentType: z.enum(['LINK', 'ATTACHMENT']).optional(),
      isPrivateIndividual: z.boolean().optional()
    })
  )
  .output(z.object({ customer: customerSchema }))
  .handleInvocation(async ctx => {
    ensureCreateName(ctx.input.id, ctx.input.name);
    let client = createClient(ctx);
    let body = pickDefined({
      ...businessBody(ctx.input),
      customerNumber: ctx.input.customerNumber,
      invoiceSendMethod: ctx.input.invoiceSendMethod,
      emailAttachmentType: ctx.input.emailAttachmentType,
      isPrivateIndividual: ctx.input.isPrivateIndividual
    });
    ensureUpdatePayload(ctx.input.id, body, 'customer');
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let value = ctx.input.id
      ? await client.updateValue(
          `/customer/${ctx.input.id}`,
          body,
          { fields: ctx.input.fields },
          companyId
        )
      : await client.createValue('/customer', body, { fields: ctx.input.fields }, companyId);
    let customer = mapCustomer(value);
    return {
      output: { customer },
      message: `${ctx.input.id ? 'Updated' : 'Created'} Tripletex customer **${entityName(customer.raw)}**.`
    };
  })
  .build();

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description:
    'List Tripletex suppliers with filters for ids, supplier numbers, organization number, email, active state, wholesaler flag, changed-since timestamp, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated supplier ids'),
      supplierNumber: z.string().optional().describe('Comma-separated supplier numbers'),
      organizationNumber: z.string().optional(),
      email: z.string().optional(),
      invoiceEmail: z.string().optional(),
      isInactive: z.boolean().optional(),
      accountManagerId: z.string().optional().describe('Comma-separated account manager ids'),
      changedSince: z.string().optional().describe('Only records changed since this datetime'),
      isWholesaler: z.boolean().optional(),
      showProducts: z.boolean().optional(),
      ...pagingInputShape
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
    let response = await client.list(
      '/supplier',
      pickDefined({
        ...commonParams(ctx.input),
        id: ctx.input.id,
        supplierNumber: ctx.input.supplierNumber,
        organizationNumber: ctx.input.organizationNumber,
        email: ctx.input.email,
        invoiceEmail: ctx.input.invoiceEmail,
        isInactive: ctx.input.isInactive,
        accountManagerId: ctx.input.accountManagerId,
        changedSince: ctx.input.changedSince,
        isWholesaler: ctx.input.isWholesaler,
        showProducts: ctx.input.showProducts
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let suppliers = (response.values ?? []).map(mapSupplier);
    return {
      output: { suppliers, ...listOutput(response) },
      message: `Found **${suppliers.length}** Tripletex supplier(s).`
    };
  })
  .build();

export let upsertSupplier = SlateTool.create(spec, {
  name: 'Upsert Supplier',
  key: 'upsert_supplier',
  description:
    'Create or update a Tripletex supplier. Provide id to update an existing supplier; omit id to create a supplier.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...baseBusinessInputShape,
      supplierNumber: z.number().int().positive().optional(),
      isCustomer: z.boolean().optional(),
      isPrivateIndividual: z.boolean().optional(),
      showProducts: z.boolean().optional()
    })
  )
  .output(z.object({ supplier: supplierSchema }))
  .handleInvocation(async ctx => {
    ensureCreateName(ctx.input.id, ctx.input.name);
    let client = createClient(ctx);
    let body = pickDefined({
      ...businessBody(ctx.input),
      supplierNumber: ctx.input.supplierNumber,
      isCustomer: ctx.input.isCustomer,
      isPrivateIndividual: ctx.input.isPrivateIndividual,
      showProducts: ctx.input.showProducts
    });
    ensureUpdatePayload(ctx.input.id, body, 'supplier');
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let value = ctx.input.id
      ? await client.updateValue(
          `/supplier/${ctx.input.id}`,
          body,
          { fields: ctx.input.fields },
          companyId
        )
      : await client.createValue('/supplier', body, { fields: ctx.input.fields }, companyId);
    let supplier = mapSupplier(value);
    return {
      output: { supplier },
      message: `${ctx.input.id ? 'Updated' : 'Created'} Tripletex supplier **${entityName(supplier.raw)}**.`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'List Tripletex contacts by name, email, customer, department, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated contact ids'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      customerId: z.string().optional().describe('Comma-separated customer ids'),
      departmentId: z.string().optional().describe('Comma-separated department ids'),
      ...pagingInputShape
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/contact',
      pickDefined({
        ...commonParams(ctx.input),
        id: ctx.input.id,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        customerId: ctx.input.customerId,
        departmentId: ctx.input.departmentId
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let contacts = (response.values ?? []).map(mapContact);
    return {
      output: { contacts, ...listOutput(response) },
      message: `Found **${contacts.length}** Tripletex contact(s).`
    };
  })
  .build();

export let upsertContact = SlateTool.create(spec, {
  name: 'Upsert Contact',
  key: 'upsert_contact',
  description:
    'Create or update a Tripletex contact. Provide id to update an existing contact; omit id to create a contact.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      id: z.number().int().positive().optional().describe('Contact id. Provide to update.'),
      version: z.number().int().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phoneNumberMobile: z.string().optional(),
      phoneNumberWork: z.string().optional(),
      customerId: z.number().int().positive().optional(),
      departmentId: z.number().int().positive().optional(),
      isInactive: z.boolean().optional(),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ contact: contactSchema }))
  .handleInvocation(async ctx => {
    ensureCreateContactIdentity(ctx.input);
    let client = createClient(ctx);
    let body = pickDefined({
      id: ctx.input.id,
      version: ctx.input.version,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phoneNumberMobile: ctx.input.phoneNumberMobile,
      phoneNumberWork: ctx.input.phoneNumberWork,
      customer: ref(ctx.input.customerId),
      department: ref(ctx.input.departmentId),
      isInactive: ctx.input.isInactive
    });
    ensureUpdatePayload(ctx.input.id, body, 'contact');
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let value = ctx.input.id
      ? await client.updateValue(
          `/contact/${ctx.input.id}`,
          body,
          { fields: ctx.input.fields },
          companyId
        )
      : await client.createValue('/contact', body, { fields: ctx.input.fields }, companyId);
    let contact = mapContact(value);

    return {
      output: { contact },
      message: `${ctx.input.id ? 'Updated' : 'Created'} Tripletex contact **${contact.displayName ?? contact.email ?? contact.id ?? 'new'}**.`
    };
  })
  .build();

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description:
    'List Tripletex employees and contacts with filters for ids, names, employee number, email, department, project-manager flags, system access, token ownership, period, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated employee ids'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      employeeNumber: z.string().optional(),
      email: z.string().optional(),
      allowInformationRegistration: z.boolean().optional(),
      includeContacts: z.boolean().optional(),
      departmentId: z.string().optional().describe('Comma-separated department ids'),
      onlyProjectManagers: z.boolean().optional(),
      onlyContacts: z.boolean().optional(),
      assignableProjectManagers: z.boolean().optional(),
      periodStart: z.string().optional().describe('Period start date, YYYY-MM-DD'),
      periodEnd: z.string().optional().describe('Period end date, YYYY-MM-DD'),
      hasSystemAccess: z.boolean().optional(),
      onlyEmployeeTokens: z.boolean().optional(),
      ...pagingInputShape
    })
  )
  .output(
    z.object({
      employees: z.array(employeeSchema),
      ...listMetadataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.list(
      '/employee',
      pickDefined({
        ...commonParams(ctx.input),
        id: ctx.input.id,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        employeeNumber: ctx.input.employeeNumber,
        email: ctx.input.email,
        allowInformationRegistration: ctx.input.allowInformationRegistration,
        includeContacts: ctx.input.includeContacts,
        departmentId: ctx.input.departmentId,
        onlyProjectManagers: ctx.input.onlyProjectManagers,
        onlyContacts: ctx.input.onlyContacts,
        assignableProjectManagers: ctx.input.assignableProjectManagers,
        periodStart: ctx.input.periodStart,
        periodEnd: ctx.input.periodEnd,
        hasSystemAccess: ctx.input.hasSystemAccess,
        onlyEmployeeTokens: ctx.input.onlyEmployeeTokens
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let employees = (response.values ?? []).map(mapEmployee);

    return {
      output: { employees, ...listOutput(response) },
      message: `Found **${employees.length}** Tripletex employee(s).`
    };
  })
  .build();

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description:
    'List Tripletex products by ids, product number, name, EAN, inventory flags, supplier, VAT, unit, price ranges, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ids: z.string().optional().describe('Comma-separated product ids'),
      productNumber: z.array(z.string()).optional().describe('Product numbers'),
      name: z.string().optional(),
      ean: z.string().optional(),
      isInactive: z.boolean().optional(),
      isStockItem: z.boolean().optional(),
      isSupplierProduct: z.boolean().optional(),
      supplierId: z.string().optional(),
      currencyId: z.string().optional(),
      vatTypeId: z.string().optional(),
      productUnitId: z.string().optional(),
      departmentId: z.string().optional(),
      accountId: z.string().optional(),
      priceExcludingVatCurrencyFrom: z.number().optional(),
      priceExcludingVatCurrencyTo: z.number().optional(),
      priceIncludingVatCurrencyFrom: z.number().optional(),
      priceIncludingVatCurrencyTo: z.number().optional(),
      ...pagingInputShape
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
    let response = await client.list(
      '/product',
      pickDefined({
        ...commonParams(ctx.input),
        ids: ctx.input.ids,
        productNumber: ctx.input.productNumber,
        name: ctx.input.name,
        ean: ctx.input.ean,
        isInactive: ctx.input.isInactive,
        isStockItem: ctx.input.isStockItem,
        isSupplierProduct: ctx.input.isSupplierProduct,
        supplierId: ctx.input.supplierId,
        currencyId: ctx.input.currencyId,
        vatTypeId: ctx.input.vatTypeId,
        productUnitId: ctx.input.productUnitId,
        departmentId: ctx.input.departmentId,
        accountId: ctx.input.accountId,
        priceExcludingVatCurrencyFrom: ctx.input.priceExcludingVatCurrencyFrom,
        priceExcludingVatCurrencyTo: ctx.input.priceExcludingVatCurrencyTo,
        priceIncludingVatCurrencyFrom: ctx.input.priceIncludingVatCurrencyFrom,
        priceIncludingVatCurrencyTo: ctx.input.priceIncludingVatCurrencyTo
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let products = (response.values ?? []).map(mapProduct);
    return {
      output: { products, ...listOutput(response) },
      message: `Found **${products.length}** Tripletex product(s).`
    };
  })
  .build();

export let upsertProduct = SlateTool.create(spec, {
  name: 'Upsert Product',
  key: 'upsert_product',
  description:
    'Create or update a Tripletex product. Provide id to update an existing product; omit id to create a product.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      id: z.number().int().positive().optional().describe('Product id. Provide to update.'),
      version: z.number().int().optional(),
      name: z.string().optional().describe('Product name. Required when creating.'),
      number: z.string().optional().describe('Product number'),
      description: z.string().optional(),
      orderLineDescription: z.string().optional(),
      ean: z.string().optional(),
      costExcludingVatCurrency: z.number().optional(),
      priceExcludingVatCurrency: z.number().optional(),
      priceIncludingVatCurrency: z.number().optional(),
      isInactive: z.boolean().optional(),
      isStockItem: z.boolean().optional(),
      productUnitId: z.number().int().positive().optional(),
      vatTypeId: z.number().int().positive().optional(),
      currencyId: z.number().int().positive().optional(),
      departmentId: z.number().int().positive().optional(),
      accountId: z.number().int().positive().optional(),
      supplierId: z.number().int().positive().optional(),
      weight: z.number().optional(),
      weightUnit: z.enum(['kg', 'g', 'hg']).optional(),
      volume: z.number().optional(),
      volumeUnit: z.enum(['cm3', 'dm3', 'm3']).optional(),
      minStockLevel: z.number().optional(),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ product: productSchema }))
  .handleInvocation(async ctx => {
    ensureCreateName(ctx.input.id, ctx.input.name);
    let client = createClient(ctx);
    let body = pickDefined({
      id: ctx.input.id,
      version: ctx.input.version,
      name: ctx.input.name,
      number: ctx.input.number,
      description: ctx.input.description,
      orderLineDescription: ctx.input.orderLineDescription,
      ean: ctx.input.ean,
      costExcludingVatCurrency: ctx.input.costExcludingVatCurrency,
      priceExcludingVatCurrency: ctx.input.priceExcludingVatCurrency,
      priceIncludingVatCurrency: ctx.input.priceIncludingVatCurrency,
      isInactive: ctx.input.isInactive,
      isStockItem: ctx.input.isStockItem,
      productUnit: ref(ctx.input.productUnitId),
      vatType: ref(ctx.input.vatTypeId),
      currency: ref(ctx.input.currencyId),
      department: ref(ctx.input.departmentId),
      account: ref(ctx.input.accountId),
      supplier: ref(ctx.input.supplierId),
      weight: ctx.input.weight,
      weightUnit: ctx.input.weightUnit,
      volume: ctx.input.volume,
      volumeUnit: ctx.input.volumeUnit,
      minStockLevel: ctx.input.minStockLevel
    });
    ensureUpdatePayload(ctx.input.id, body, 'product');
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let value = ctx.input.id
      ? await client.updateValue(
          `/product/${ctx.input.id}`,
          body,
          { fields: ctx.input.fields },
          companyId
        )
      : await client.createValue('/product', body, { fields: ctx.input.fields }, companyId);
    let product = mapProduct(value);
    return {
      output: { product },
      message: `${ctx.input.id ? 'Updated' : 'Created'} Tripletex product **${entityName(product.raw)}**.`
    };
  })
  .build();

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'List Tripletex projects by id, name, number, customer, manager, department, date range, status flags, pagination, sorting, and fields.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      id: z.string().optional().describe('Comma-separated project ids'),
      name: z.string().optional(),
      number: z.string().optional(),
      isOffer: z.boolean().optional(),
      projectManagerId: z.string().optional(),
      customerAccountManagerId: z.string().optional(),
      employeeInProjectId: z.string().optional(),
      departmentId: z.string().optional(),
      startDateFrom: z.string().optional(),
      startDateTo: z.string().optional(),
      endDateFrom: z.string().optional(),
      endDateTo: z.string().optional(),
      isClosed: z.boolean().optional(),
      isFixedPrice: z.boolean().optional(),
      customerId: z.string().optional(),
      includeRecentlyClosed: z.boolean().optional(),
      ...pagingInputShape
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
    let response = await client.list(
      '/project',
      pickDefined({
        ...commonParams(ctx.input),
        id: ctx.input.id,
        name: ctx.input.name,
        number: ctx.input.number,
        isOffer: ctx.input.isOffer,
        projectManagerId: ctx.input.projectManagerId,
        customerAccountManagerId: ctx.input.customerAccountManagerId,
        employeeInProjectId: ctx.input.employeeInProjectId,
        departmentId: ctx.input.departmentId,
        startDateFrom: ctx.input.startDateFrom,
        startDateTo: ctx.input.startDateTo,
        endDateFrom: ctx.input.endDateFrom,
        endDateTo: ctx.input.endDateTo,
        isClosed: ctx.input.isClosed,
        isFixedPrice: ctx.input.isFixedPrice,
        customerId: ctx.input.customerId,
        includeRecentlyClosed: ctx.input.includeRecentlyClosed
      }),
      companyIdFor(ctx, ctx.input.companyId)
    );
    let projects = (response.values ?? []).map(mapProject);
    return {
      output: { projects, ...listOutput(response) },
      message: `Found **${projects.length}** Tripletex project(s).`
    };
  })
  .build();

export let upsertProject = SlateTool.create(spec, {
  name: 'Upsert Project',
  key: 'upsert_project',
  description:
    'Create or update a Tripletex project. Provide id to update an existing project; omit id to create a project.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      id: z.number().int().positive().optional().describe('Project id. Provide to update.'),
      version: z.number().int().optional(),
      name: z.string().optional().describe('Project name. Required when creating.'),
      number: z.string().optional(),
      description: z.string().optional(),
      customerId: z.number().int().positive().optional(),
      projectManagerId: z.number().int().positive().optional(),
      departmentId: z.number().int().positive().optional(),
      mainProjectId: z.number().int().positive().optional(),
      projectCategoryId: z.number().int().positive().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isClosed: z.boolean().optional(),
      isOffer: z.boolean().optional(),
      isFixedPrice: z.boolean().optional(),
      fixedprice: z.number().optional(),
      reference: z.string().optional(),
      externalAccountsNumber: z.string().optional(),
      fields: pagingInputShape.fields,
      companyId: pagingInputShape.companyId
    })
  )
  .output(z.object({ project: projectSchema }))
  .handleInvocation(async ctx => {
    ensureCreateName(ctx.input.id, ctx.input.name);
    let client = createClient(ctx);
    let body = pickDefined({
      id: ctx.input.id,
      version: ctx.input.version,
      name: ctx.input.name,
      number: ctx.input.number,
      description: ctx.input.description,
      customer: ref(ctx.input.customerId),
      projectManager: ref(ctx.input.projectManagerId),
      department: ref(ctx.input.departmentId),
      mainProject: ref(ctx.input.mainProjectId),
      projectCategory: ref(ctx.input.projectCategoryId),
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      isClosed: ctx.input.isClosed,
      isOffer: ctx.input.isOffer,
      isFixedPrice: ctx.input.isFixedPrice,
      fixedprice: ctx.input.fixedprice,
      reference: ctx.input.reference,
      externalAccountsNumber: ctx.input.externalAccountsNumber
    });
    ensureUpdatePayload(ctx.input.id, body, 'project');
    let companyId = companyIdFor(ctx, ctx.input.companyId);
    let value = ctx.input.id
      ? await client.updateValue(
          `/project/${ctx.input.id}`,
          body,
          { fields: ctx.input.fields },
          companyId
        )
      : await client.createValue('/project', body, { fields: ctx.input.fields }, companyId);
    let project = mapProject(value);
    return {
      output: { project },
      message: `${ctx.input.id ? 'Updated' : 'Created'} Tripletex project **${entityName(project.raw)}**.`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: 'Delete a Tripletex project by id.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().int().positive().describe('Tripletex project id to delete.'),
      companyId: pagingInputShape.companyId
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Deleted Tripletex project id')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.delete(
      `/project/${ctx.input.projectId}`,
      companyIdFor(ctx, ctx.input.companyId)
    );

    return {
      output: {
        projectId: ctx.input.projectId
      },
      message: `Deleted Tripletex project **${ctx.input.projectId}**.`
    };
  })
  .build();
