import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildPatch, compact, type JsonPatchOperation } from '../lib/client';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  buildAddressBody,
  buildListParams,
  compactOutput,
  contactAddressInputSchema,
  contactAddressOutputSchema,
  createClient,
  mapAddress,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  recordValue,
  requireExactlyOne,
  stringValue
} from './shared';

let customerSchema = z.object({
  id: z.number().optional().describe('PowerOffice contact/customer id.'),
  number: z.number().optional().describe('Customer number.'),
  externalNumber: z.number().optional().describe('External customer number.'),
  externalImportReference: z.string().optional().describe('External import reference.'),
  name: z.string().optional().describe('Customer display or company name.'),
  legalName: z.string().optional().describe('Customer legal name.'),
  firstName: z.string().optional().describe('First name for person customers.'),
  lastName: z.string().optional().describe('Last name for person customers.'),
  organizationNumber: z.string().optional().describe('Organization/VAT number.'),
  emailAddress: z.string().optional().describe('General email address.'),
  invoiceEmailAddress: z.string().optional().describe('Default invoice email address.'),
  phoneNumber: z.string().optional().describe('Phone number.'),
  websiteUrl: z.string().optional().describe('Website URL.'),
  currencyCode: z.string().optional().describe('Default currency code.'),
  paymentTerm: z.number().optional().describe('Default payment term in days.'),
  paymentTermId: z.number().optional().describe('Payment term id.'),
  isActive: z.boolean().optional().describe('Whether the customer role is active.'),
  isArchived: z.boolean().optional().describe('Whether the contact is archived.'),
  isPerson: z.boolean().optional().describe('Whether this customer is a person.'),
  customerCreatedDateTimeOffset: z.string().optional().describe('Customer created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  mailAddress: contactAddressOutputSchema.optional(),
  record: rawRecordSchema
});

let supplierSchema = z.object({
  id: z.number().optional().describe('PowerOffice contact/supplier id.'),
  number: z.number().optional().describe('Supplier number.'),
  externalNumber: z.number().optional().describe('External supplier number.'),
  externalImportReference: z.string().optional().describe('External import reference.'),
  name: z.string().optional().describe('Supplier display or company name.'),
  legalName: z.string().optional().describe('Supplier legal name.'),
  organizationNumber: z.string().optional().describe('Organization/VAT number.'),
  emailAddress: z.string().optional().describe('General email address.'),
  phoneNumber: z.string().optional().describe('Phone number.'),
  isActive: z.boolean().optional().describe('Whether the supplier role is active.'),
  isArchived: z.boolean().optional().describe('Whether the contact is archived.'),
  subledgerAccountId: z.number().optional().describe('Supplier subledger account id.'),
  supplierCreatedDateTimeOffset: z.string().optional().describe('Supplier created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  mailAddress: contactAddressOutputSchema.optional(),
  record: rawRecordSchema
});

let customerBodyInputSchema = {
  name: z
    .string()
    .nullable()
    .optional()
    .describe('Company/customer name. Required for company customer creation.'),
  legalName: z.string().nullable().optional().describe('Legal company name.'),
  firstName: z.string().nullable().optional().describe('Person first name.'),
  lastName: z.string().nullable().optional().describe('Person last name.'),
  isPerson: z.boolean().nullable().optional().describe('Whether this customer is a person.'),
  isArchived: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether this customer is archived/inactive.'),
  number: z.number().int().nullable().optional().describe('PowerOffice customer number.'),
  externalNumber: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('External system customer number.'),
  externalImportReference: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .describe('External import reference for idempotency and lookup.'),
  organizationNumber: z.string().nullable().optional().describe('Organization/VAT number.'),
  emailAddress: z.string().nullable().optional().describe('General email address.'),
  invoiceEmailAddress: z
    .string()
    .nullable()
    .optional()
    .describe('Default invoice email address.'),
  phoneNumber: z.string().nullable().optional().describe('Phone number.'),
  websiteUrl: z.string().nullable().optional().describe('Website URL.'),
  currencyCode: z.string().nullable().optional().describe('Default ISO 4217 currency code.'),
  paymentTerm: z.number().int().nullable().optional().describe('Payment term in days.'),
  paymentTermId: z.number().int().nullable().optional().describe('Payment term id.'),
  contactGroupIds: z
    .array(z.number().int())
    .nullable()
    .optional()
    .describe('Contact group ids to assign to this customer.'),
  mailAddress: contactAddressInputSchema.nullable().optional()
};

let supplierBodyInputSchema = {
  name: z
    .string()
    .nullable()
    .optional()
    .describe('Company/supplier name. Required for company supplier creation.'),
  legalName: z.string().nullable().optional().describe('Legal company name.'),
  firstName: z.string().nullable().optional().describe('Person first name.'),
  lastName: z.string().nullable().optional().describe('Person last name.'),
  isPerson: z.boolean().nullable().optional().describe('Whether this supplier is a person.'),
  isArchived: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether this supplier is archived/inactive.'),
  number: z.number().int().nullable().optional().describe('PowerOffice supplier number.'),
  externalNumber: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('External system supplier number.'),
  externalImportReference: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .describe('External import reference for idempotency and lookup.'),
  organizationNumber: z.string().nullable().optional().describe('Organization/VAT number.'),
  emailAddress: z.string().nullable().optional().describe('General email address.'),
  phoneNumber: z.string().nullable().optional().describe('Phone number.'),
  websiteUrl: z.string().nullable().optional().describe('Website URL.'),
  currencyCode: z.string().nullable().optional().describe('Default ISO 4217 currency code.'),
  currencyRate: z.number().nullable().optional().describe('Default currency rate.'),
  payout: z.boolean().nullable().optional().describe('Whether payout is enabled.'),
  paymentClientBankAccountId: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Default client bank account id for payments.'),
  contactGroupIds: z
    .array(z.number().int())
    .nullable()
    .optional()
    .describe('Contact group ids to assign to this supplier.'),
  mailAddress: contactAddressInputSchema.nullable().optional()
};

let mapCustomer = (customer: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(customer, 'Id'),
    number: numberValue(customer, 'Number'),
    externalNumber: numberValue(customer, 'ExternalNumber'),
    externalImportReference: stringValue(customer, 'ExternalImportReference'),
    name: stringValue(customer, 'Name'),
    legalName: stringValue(customer, 'LegalName'),
    firstName: stringValue(customer, 'FirstName'),
    lastName: stringValue(customer, 'LastName'),
    organizationNumber: stringValue(customer, 'OrganizationNumber'),
    emailAddress: stringValue(customer, 'EmailAddress'),
    invoiceEmailAddress: stringValue(customer, 'InvoiceEmailAddress'),
    phoneNumber: stringValue(customer, 'PhoneNumber'),
    websiteUrl: stringValue(customer, 'WebsiteUrl'),
    currencyCode: stringValue(customer, 'CurrencyCode'),
    paymentTerm: numberValue(customer, 'PaymentTerm'),
    paymentTermId: numberValue(customer, 'PaymentTermId'),
    isActive:
      typeof customer.IsActive === 'boolean' ? (customer.IsActive as boolean) : undefined,
    isArchived:
      typeof customer.IsArchived === 'boolean' ? (customer.IsArchived as boolean) : undefined,
    isPerson:
      typeof customer.IsPerson === 'boolean' ? (customer.IsPerson as boolean) : undefined,
    customerCreatedDateTimeOffset: stringValue(customer, 'CustomerCreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(customer, 'LastChangedDateTimeOffset'),
    mailAddress: mapAddress(recordValue(customer, 'MailAddress'))
  }),
  record: customer
});

let mapSupplier = (supplier: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(supplier, 'Id'),
    number: numberValue(supplier, 'Number'),
    externalNumber: numberValue(supplier, 'ExternalNumber'),
    externalImportReference: stringValue(supplier, 'ExternalImportReference'),
    name: stringValue(supplier, 'Name'),
    legalName: stringValue(supplier, 'LegalName'),
    organizationNumber: stringValue(supplier, 'OrganizationNumber'),
    emailAddress: stringValue(supplier, 'EmailAddress'),
    phoneNumber: stringValue(supplier, 'PhoneNumber'),
    isActive:
      typeof supplier.IsActive === 'boolean' ? (supplier.IsActive as boolean) : undefined,
    isArchived:
      typeof supplier.IsArchived === 'boolean' ? (supplier.IsArchived as boolean) : undefined,
    subledgerAccountId: numberValue(supplier, 'SubledgerAccountId'),
    supplierCreatedDateTimeOffset: stringValue(supplier, 'SupplierCreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(supplier, 'LastChangedDateTimeOffset'),
    mailAddress: mapAddress(recordValue(supplier, 'MailAddress'))
  }),
  record: supplier
});

let upsertCustomerInputSchema = z.object({
  operation: z
    .enum(['create', 'update', 'upsert'])
    .describe(
      'Create a new customer, update an existing customer, or upsert by customerId/externalImportReference/customerNo/externalNumber.'
    ),
  customerId: z.number().int().optional().describe('PowerOffice customer id for update.'),
  lookupCustomerNo: z
    .number()
    .int()
    .optional()
    .describe('Customer number to look up before update/upsert.'),
  lookupExternalNumber: z
    .number()
    .int()
    .optional()
    .describe('External customer number to look up before update/upsert.'),
  ...customerBodyInputSchema
});

let upsertSupplierInputSchema = z.object({
  operation: z
    .enum(['create', 'update', 'upsert'])
    .describe(
      'Create a new supplier, update an existing supplier, or upsert by supplierId/externalImportReference/supplierNo/externalNumber.'
    ),
  supplierId: z.number().int().optional().describe('PowerOffice supplier id for update.'),
  lookupSupplierNo: z
    .number()
    .int()
    .optional()
    .describe('Supplier number to look up before update/upsert.'),
  lookupExternalNumber: z
    .number()
    .int()
    .optional()
    .describe('External supplier number to look up before update/upsert.'),
  ...supplierBodyInputSchema
});

let buildCustomerBody = (input: z.infer<typeof upsertCustomerInputSchema>) =>
  compact({
    Name: input.name,
    LegalName: input.legalName,
    FirstName: input.firstName,
    LastName: input.lastName,
    IsPerson: input.isPerson,
    IsArchived: input.isArchived,
    Number: input.number,
    ExternalNumber: input.externalNumber,
    ExternalImportReference: input.externalImportReference,
    OrganizationNumber: input.organizationNumber,
    EmailAddress: input.emailAddress,
    InvoiceEmailAddress: input.invoiceEmailAddress,
    PhoneNumber: input.phoneNumber,
    WebsiteUrl: input.websiteUrl,
    CurrencyCode: input.currencyCode,
    PaymentTerm: input.paymentTerm,
    PaymentTermId: input.paymentTermId,
    ContactGroupIds: input.contactGroupIds,
    MailAddress: buildAddressBody(input.mailAddress ?? undefined)
  });

let buildSupplierBody = (input: z.infer<typeof upsertSupplierInputSchema>) =>
  compact({
    Name: input.name,
    LegalName: input.legalName,
    FirstName: input.firstName,
    LastName: input.lastName,
    IsPerson: input.isPerson,
    IsArchived: input.isArchived,
    Number: input.number,
    ExternalNumber: input.externalNumber,
    ExternalImportReference: input.externalImportReference,
    OrganizationNumber: input.organizationNumber,
    EmailAddress: input.emailAddress,
    PhoneNumber: input.phoneNumber,
    WebsiteUrl: input.websiteUrl,
    CurrencyCode: input.currencyCode,
    CurrencyRate: input.currencyRate,
    Payout: input.payout,
    PaymentClientBankAccountId: input.paymentClientBankAccountId,
    ContactGroupIds: input.contactGroupIds,
    MailAddress: buildAddressBody(input.mailAddress ?? undefined)
  });

let assertCustomerCreateInput = (input: z.infer<typeof upsertCustomerInputSchema>) => {
  if (!input.isPerson && !input.name) {
    throw powerOfficeValidationError('name is required when creating a company customer.');
  }
  if (input.isPerson && (!input.firstName || !input.lastName)) {
    throw powerOfficeValidationError(
      'firstName and lastName are required when creating a person customer.'
    );
  }
};

let assertSupplierCreateInput = (input: z.infer<typeof upsertSupplierInputSchema>) => {
  if (!input.isPerson && !input.name) {
    throw powerOfficeValidationError('name is required when creating a company supplier.');
  }
  if (input.isPerson && (!input.firstName || !input.lastName)) {
    throw powerOfficeValidationError(
      'firstName and lastName are required when creating a person supplier.'
    );
  }
};

let buildCustomerPatch = (
  input: z.infer<typeof upsertCustomerInputSchema>
): JsonPatchOperation[] => {
  if (input.paymentTerm !== undefined) {
    throw powerOfficeValidationError(
      'paymentTerm can only be set when creating a customer. Use paymentTermId when updating a customer.'
    );
  }

  if (input.mailAddress === null) {
    throw powerOfficeValidationError(
      'mailAddress cannot be set to null when updating a customer. Set individual mailAddress fields to null to clear them.'
    );
  }

  let patch = buildPatch(
    compact({
      Name: input.name,
      LegalName: input.legalName,
      FirstName: input.firstName,
      LastName: input.lastName,
      IsPerson: input.isPerson,
      IsArchived: input.isArchived,
      Number: input.number,
      ExternalNumber: input.externalNumber,
      ExternalImportReference: input.externalImportReference,
      OrganizationNumber: input.organizationNumber,
      EmailAddress: input.emailAddress,
      InvoiceEmailAddress: input.invoiceEmailAddress,
      PhoneNumber: input.phoneNumber,
      WebsiteUrl: input.websiteUrl,
      CurrencyCode: input.currencyCode,
      PaymentTermId: input.paymentTermId,
      ContactGroupIds: input.contactGroupIds
    })
  );

  let mailAddress = buildAddressBody(input.mailAddress);
  if (mailAddress) {
    for (let [key, value] of Object.entries(mailAddress)) {
      if (value !== undefined) {
        patch.push({
          op: 'replace',
          path: `/MailAddress/${key}`,
          value
        });
      }
    }
  }

  return patch;
};

let resolveCustomerId = async (
  client: ReturnType<typeof createClient>,
  input: z.infer<typeof upsertCustomerInputSchema>
) => {
  if (input.customerId !== undefined) return input.customerId;

  requireExactlyOne(
    {
      externalImportReference: input.externalImportReference,
      lookupCustomerNo: input.lookupCustomerNo,
      lookupExternalNumber: input.lookupExternalNumber
    },
    'Provide exactly one of externalImportReference, lookupCustomerNo, or lookupExternalNumber to update or upsert a customer when customerId is not provided.'
  );

  let matches = await client.listCustomers({
    externalImportReference: input.externalImportReference ?? undefined,
    customerNos: input.lookupCustomerNo,
    externalNos: input.lookupExternalNumber,
    PageNumber: 1,
    PageSize: 2
  });

  if (matches.length === 0) return undefined;
  if (matches.length > 1) {
    throw powerOfficeValidationError(
      'Customer lookup returned multiple matches. Provide customerId to update safely.'
    );
  }

  let id = numberValue(matches[0] ?? {}, 'Id');
  if (id === undefined) {
    throw powerOfficeValidationError('Customer lookup did not return a PowerOffice id.');
  }

  return id;
};

let buildSupplierPatch = (
  input: z.infer<typeof upsertSupplierInputSchema>
): JsonPatchOperation[] => {
  if (input.mailAddress === null) {
    throw powerOfficeValidationError(
      'mailAddress cannot be set to null when updating a supplier. Set individual mailAddress fields to null to clear them.'
    );
  }

  let patch = buildPatch(
    compact({
      Name: input.name,
      LegalName: input.legalName,
      FirstName: input.firstName,
      LastName: input.lastName,
      IsPerson: input.isPerson,
      IsArchived: input.isArchived,
      Number: input.number,
      ExternalNumber: input.externalNumber,
      ExternalImportReference: input.externalImportReference,
      OrganizationNumber: input.organizationNumber,
      EmailAddress: input.emailAddress,
      PhoneNumber: input.phoneNumber,
      WebsiteUrl: input.websiteUrl,
      CurrencyCode: input.currencyCode,
      CurrencyRate: input.currencyRate,
      Payout: input.payout,
      PaymentClientBankAccountId: input.paymentClientBankAccountId,
      ContactGroupIds: input.contactGroupIds
    })
  );

  let mailAddress = buildAddressBody(input.mailAddress);
  if (mailAddress) {
    for (let [key, value] of Object.entries(mailAddress)) {
      if (value !== undefined) {
        patch.push({
          op: 'replace',
          path: `/MailAddress/${key}`,
          value
        });
      }
    }
  }

  return patch;
};

let resolveSupplierId = async (
  client: ReturnType<typeof createClient>,
  input: z.infer<typeof upsertSupplierInputSchema>
) => {
  if (input.supplierId !== undefined) return input.supplierId;

  requireExactlyOne(
    {
      externalImportReference: input.externalImportReference,
      lookupSupplierNo: input.lookupSupplierNo,
      lookupExternalNumber: input.lookupExternalNumber
    },
    'Provide exactly one of externalImportReference, lookupSupplierNo, or lookupExternalNumber to update or upsert a supplier when supplierId is not provided.'
  );

  let matches = await client.listSuppliers({
    externalImportReference: input.externalImportReference ?? undefined,
    supplierNos: input.lookupSupplierNo,
    externalNos: input.lookupExternalNumber,
    PageNumber: 1,
    PageSize: 2
  });

  if (matches.length === 0) return undefined;
  if (matches.length > 1) {
    throw powerOfficeValidationError(
      'Supplier lookup returned multiple matches. Provide supplierId to update safely.'
    );
  }

  let id = numberValue(matches[0] ?? {}, 'Id');
  if (id === undefined) {
    throw powerOfficeValidationError('Supplier lookup did not return a PowerOffice id.');
  }

  return id;
};

export let powerofficeListCustomers = SlateTool.create(spec, {
  name: 'List PowerOffice Customers',
  key: 'poweroffice_list_customers',
  description:
    'List and filter PowerOffice customer master records by customer number, external reference, organization number, contact details, or changed timestamp.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerNos: z
        .string()
        .optional()
        .describe(
          'PowerOffice customer number filter, including ranges such as "10000-11000".'
        ),
      externalNos: z
        .string()
        .optional()
        .describe('External customer number filter, including ranges.'),
      externalImportReference: z.string().optional().describe('External import reference.'),
      organizationNumbers: z.string().optional().describe('Organization/VAT numbers filter.'),
      phoneNumbers: z.string().optional().describe('Phone numbers filter.'),
      emailAddresses: z.string().optional().describe('Email addresses filter.'),
      contactGroupIds: z.string().optional().describe('Comma-separated contact group ids.'),
      customerCreatedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return customers created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return customers changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema).describe('Customers returned by PowerOffice.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let customers = await client.listCustomers(
      buildListParams(ctx.input, {
        contactGroupIds: ctx.input.contactGroupIds,
        customerCreatedDateTimeOffsetGreaterThan:
          ctx.input.customerCreatedDateTimeOffsetGreaterThan,
        customerNos: ctx.input.customerNos,
        externalImportReference: ctx.input.externalImportReference,
        externalNos: ctx.input.externalNos,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan,
        organizationNumbers: ctx.input.organizationNumbers,
        phoneNumbers: ctx.input.phoneNumbers,
        emailAddresses: ctx.input.emailAddresses
      })
    );

    return {
      output: {
        customers: customers.map(mapCustomer),
        page: pageSummary(ctx.input, customers.length)
      },
      message: `Retrieved **${customers.length}** PowerOffice customer(s).`
    };
  })
  .build();

export let powerofficeUpsertCustomer = SlateTool.create(spec, {
  name: 'Upsert PowerOffice Customer',
  key: 'poweroffice_upsert_customer',
  description:
    'Create, update, or idempotently upsert a PowerOffice customer for CRM, ecommerce, or billing synchronization.',
  instructions: [
    'Use operation "create" when no existing PowerOffice customer should be modified.',
    'Use operation "update" with customerId when possible. If customerId is not available, provide a single lookup field.',
    'Use operation "upsert" with externalImportReference, lookupCustomerNo, or lookupExternalNumber to update the match or create a new customer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(upsertCustomerInputSchema)
  .output(
    z.object({
      operation: z.enum(['created', 'updated']).describe('Operation actually performed.'),
      customer: customerSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let body = buildCustomerBody(ctx.input);

    if (ctx.input.operation === 'create') {
      assertCustomerCreateInput(ctx.input);

      let customer = await client.createCustomer(body);
      return {
        output: {
          operation: 'created',
          customer: mapCustomer(customer)
        },
        message: `Created PowerOffice customer **${stringValue(customer, 'Name') ?? numberValue(customer, 'Number') ?? numberValue(customer, 'Id')}**.`
      };
    }

    let customerId = await resolveCustomerId(client, ctx.input);

    if (customerId === undefined) {
      if (ctx.input.operation !== 'upsert') {
        throw powerOfficeValidationError('No PowerOffice customer matched the update lookup.');
      }

      assertCustomerCreateInput(ctx.input);

      let customer = await client.createCustomer(body);
      return {
        output: {
          operation: 'created',
          customer: mapCustomer(customer)
        },
        message: `Created PowerOffice customer **${stringValue(customer, 'Name') ?? numberValue(customer, 'Number') ?? numberValue(customer, 'Id')}**.`
      };
    }

    let customer = await client.updateCustomer(customerId, buildCustomerPatch(ctx.input));
    return {
      output: {
        operation: 'updated',
        customer: mapCustomer(customer)
      },
      message: `Updated PowerOffice customer **${numberValue(customer, 'Number') ?? customerId}**.`
    };
  })
  .build();

export let powerofficeListSuppliers = SlateTool.create(spec, {
  name: 'List PowerOffice Suppliers',
  key: 'poweroffice_list_suppliers',
  description:
    'List and filter PowerOffice supplier master records by supplier number, external reference, organization number, contact details, or changed timestamp.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      supplierNos: z
        .string()
        .optional()
        .describe('PowerOffice supplier number filter, including ranges.'),
      externalNos: z
        .string()
        .optional()
        .describe('External supplier number filter, including ranges.'),
      externalImportReference: z.string().optional().describe('External import reference.'),
      organizationNumbers: z.string().optional().describe('Organization/VAT numbers filter.'),
      phoneNumbers: z.string().optional().describe('Phone numbers filter.'),
      emailAddresses: z.string().optional().describe('Email addresses filter.'),
      contactGroupIds: z.string().optional().describe('Comma-separated contact group ids.'),
      supplierCreatedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return suppliers created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return suppliers changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierSchema).describe('Suppliers returned by PowerOffice.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let suppliers = await client.listSuppliers(
      buildListParams(ctx.input, {
        contactGroupIds: ctx.input.contactGroupIds,
        externalImportReference: ctx.input.externalImportReference,
        externalNos: ctx.input.externalNos,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan,
        supplierCreatedDateTimeOffsetGreaterThan:
          ctx.input.supplierCreatedDateTimeOffsetGreaterThan,
        supplierNos: ctx.input.supplierNos,
        organizationNumbers: ctx.input.organizationNumbers,
        phoneNumbers: ctx.input.phoneNumbers,
        emailAddresses: ctx.input.emailAddresses
      })
    );

    return {
      output: {
        suppliers: suppliers.map(mapSupplier),
        page: pageSummary(ctx.input, suppliers.length)
      },
      message: `Retrieved **${suppliers.length}** PowerOffice supplier(s).`
    };
  })
  .build();

export let powerofficeUpsertSupplier = SlateTool.create(spec, {
  name: 'Upsert PowerOffice Supplier',
  key: 'poweroffice_upsert_supplier',
  description:
    'Create, update, or idempotently upsert a PowerOffice supplier for accounts payable and purchasing synchronization.',
  instructions: [
    'Use operation "create" when no existing PowerOffice supplier should be modified.',
    'Use operation "update" with supplierId when possible. If supplierId is not available, provide a single lookup field.',
    'Use operation "upsert" with externalImportReference, lookupSupplierNo, or lookupExternalNumber to update the match or create a new supplier.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(upsertSupplierInputSchema)
  .output(
    z.object({
      operation: z.enum(['created', 'updated']).describe('Operation actually performed.'),
      supplier: supplierSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let body = buildSupplierBody(ctx.input);

    if (ctx.input.operation === 'create') {
      assertSupplierCreateInput(ctx.input);

      let supplier = await client.createSupplier(body);
      return {
        output: {
          operation: 'created',
          supplier: mapSupplier(supplier)
        },
        message: `Created PowerOffice supplier **${stringValue(supplier, 'Name') ?? numberValue(supplier, 'Number') ?? numberValue(supplier, 'Id')}**.`
      };
    }

    let supplierId = await resolveSupplierId(client, ctx.input);

    if (supplierId === undefined) {
      if (ctx.input.operation !== 'upsert') {
        throw powerOfficeValidationError('No PowerOffice supplier matched the update lookup.');
      }

      assertSupplierCreateInput(ctx.input);

      let supplier = await client.createSupplier(body);
      return {
        output: {
          operation: 'created',
          supplier: mapSupplier(supplier)
        },
        message: `Created PowerOffice supplier **${stringValue(supplier, 'Name') ?? numberValue(supplier, 'Number') ?? numberValue(supplier, 'Id')}**.`
      };
    }

    let supplier = await client.updateSupplier(supplierId, buildSupplierPatch(ctx.input));
    return {
      output: {
        operation: 'updated',
        supplier: mapSupplier(supplier)
      },
      message: `Updated PowerOffice supplier **${numberValue(supplier, 'Number') ?? supplierId}**.`
    };
  })
  .build();
