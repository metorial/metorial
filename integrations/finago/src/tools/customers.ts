import { SlateTool } from 'slates';
import { z } from 'zod';
import { finagoServiceError, requireInput, requireUpdateFields } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import {
  getNumber,
  getString,
  isRecord,
  mergeAdditionalFields,
  objectWithDefined
} from '../lib/records';
import { spec } from '../spec';
import { additionalFieldsSchema, maxPagesSchema } from './shared';

let nullableString = (description: string) =>
  z.string().nullable().optional().describe(description);

let customerAddressBasicSchema = z.object({
  street: nullableString('Street address.'),
  postalCode: nullableString('Postal code.'),
  postalArea: nullableString('Postal area.'),
  countrySubdivision: nullableString('County, state, or other country subdivision.')
});

let customerVisitAddressSchema = customerAddressBasicSchema
  .extend({
    countryCode: z
      .string()
      .max(2)
      .nullable()
      .optional()
      .describe('Two-letter ISO 3166-1 alpha-2 country code.')
  })
  .describe('Visiting address.');

let customerPostalAddressSchema = customerAddressBasicSchema.describe('Postal address.');

let customerNamedAddressSchema = customerAddressBasicSchema
  .extend({
    name: nullableString('Name for the address.'),
    countryCode: z
      .string()
      .max(2)
      .nullable()
      .optional()
      .describe('Two-letter ISO 3166-1 alpha-2 country code.')
  })
  .describe('Billing or delivery address.');

let customerSchema = z.object({
  customerId: z.number().optional().describe('Finago customer ID.'),
  name: z.string().optional().describe('Customer name.'),
  externalReference: z.string().optional().describe('External customer reference.'),
  pricelistId: z.number().optional().describe('Finago customer price list ID.'),
  firstName: z.string().optional().describe('Person customer first name.'),
  lastName: z.string().optional().describe('Person customer last name.'),
  isCompany: z.boolean().optional().describe('Whether this customer is a company.'),
  isSupplier: z.boolean().optional().describe('Whether this customer is also a supplier.'),
  organizationNumber: z.string().optional().describe('Organization number.'),
  emailContact: z.string().optional().describe('Contact email address.'),
  emailBilling: z.string().optional().describe('Billing email address.'),
  phone: z.string().optional().describe('Phone number.'),
  mobilePhone: z.string().optional().describe('Mobile phone number.'),
  createdAt: z.string().optional().describe('Created timestamp.'),
  modifiedAt: z.string().optional().describe('Modified timestamp.'),
  record: z.unknown().describe('Raw Finago customer record.')
});

let nestedString = (record: unknown, parent: string, key: string) => {
  if (!isRecord(record) || !isRecord(record[parent])) return undefined;
  let value = record[parent][key];
  return typeof value === 'string' ? value : undefined;
};

let mapCustomer = (record: unknown) => ({
  customerId: getNumber(record, 'id'),
  name: getString(record, 'name'),
  externalReference: getString(record, 'externalReference'),
  pricelistId: getNumber(record, 'pricelistId'),
  firstName: nestedString(record, 'person', 'firstName'),
  lastName: nestedString(record, 'person', 'lastName'),
  isCompany:
    isRecord(record) && typeof record.isCompany === 'boolean' ? record.isCompany : undefined,
  isSupplier:
    isRecord(record) && typeof record.isSupplier === 'boolean' ? record.isSupplier : undefined,
  organizationNumber: getString(record, 'organizationNumber'),
  emailContact: nestedString(record, 'email', 'contact'),
  emailBilling: nestedString(record, 'email', 'billing'),
  phone: getString(record, 'phone'),
  mobilePhone: getString(record, 'mobilePhone'),
  createdAt: getString(record, 'createdAt'),
  modifiedAt: getString(record, 'modifiedAt'),
  record
});

type CustomerBodyInput = {
  isCompany?: boolean;
  name?: string | null;
  organizationNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  externalReference?: string | null;
  isSupplier?: boolean;
  visitAddress?: z.infer<typeof customerVisitAddressSchema>;
  postalAddress?: z.infer<typeof customerPostalAddressSchema>;
  billingAddress?: z.infer<typeof customerNamedAddressSchema>;
  deliveryAddress?: z.infer<typeof customerNamedAddressSchema>;
  emailContact?: string | null;
  emailBilling?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  additionalFields?: Record<string, unknown>;
};

let hasText = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

let hasAdditionalField = (
  additionalFields: Record<string, unknown> | undefined,
  key: string
) => Object.prototype.hasOwnProperty.call(additionalFields ?? {}, key);

let rejectAdditionalFields = (
  additionalFields: Record<string, unknown> | undefined,
  keys: string[],
  context: string
) => {
  let conflicts = keys.filter(key => hasAdditionalField(additionalFields, key));
  if (conflicts.length === 0) return;

  throw finagoServiceError(
    `${conflicts.join(', ')} cannot be supplied in additionalFields when ${context}.`
  );
};

let compactRecord = (record: Record<string, unknown>) => {
  let compacted = objectWithDefined(record);
  return Object.keys(compacted).length > 0 ? compacted : undefined;
};

let customerAddressBody = (input: {
  visitAddress?: z.infer<typeof customerVisitAddressSchema>;
  postalAddress?: z.infer<typeof customerPostalAddressSchema>;
  billingAddress?: z.infer<typeof customerNamedAddressSchema>;
  deliveryAddress?: z.infer<typeof customerNamedAddressSchema>;
}) =>
  compactRecord({
    visit: compactRecord({
      street: input.visitAddress?.street,
      postalCode: input.visitAddress?.postalCode,
      postalArea: input.visitAddress?.postalArea,
      countrySubdivision: input.visitAddress?.countrySubdivision,
      countryCode: input.visitAddress?.countryCode
    }),
    postal: compactRecord({
      street: input.postalAddress?.street,
      postalCode: input.postalAddress?.postalCode,
      postalArea: input.postalAddress?.postalArea,
      countrySubdivision: input.postalAddress?.countrySubdivision
    }),
    billing: compactRecord({
      name: input.billingAddress?.name,
      street: input.billingAddress?.street,
      postalCode: input.billingAddress?.postalCode,
      postalArea: input.billingAddress?.postalArea,
      countrySubdivision: input.billingAddress?.countrySubdivision,
      countryCode: input.billingAddress?.countryCode
    }),
    delivery: compactRecord({
      name: input.deliveryAddress?.name,
      street: input.deliveryAddress?.street,
      postalCode: input.deliveryAddress?.postalCode,
      postalArea: input.deliveryAddress?.postalArea,
      countrySubdivision: input.deliveryAddress?.countrySubdivision,
      countryCode: input.deliveryAddress?.countryCode
    })
  });

let customerBody = (input: CustomerBodyInput, operation: 'create' | 'update') => {
  let body: Record<string, unknown> = objectWithDefined({
    externalReference: input.externalReference,
    isSupplier: input.isSupplier,
    phone: input.phone,
    mobilePhone: input.mobilePhone
  });

  if (operation === 'create') {
    Object.assign(
      body,
      objectWithDefined({
        isCompany: input.isCompany
      })
    );

    if (input.isCompany) {
      Object.assign(
        body,
        objectWithDefined({
          name: input.name,
          organizationNumber: input.organizationNumber
        })
      );
    } else {
      body.person = objectWithDefined({
        firstName: input.firstName,
        lastName: input.lastName
      });
    }
  } else {
    Object.assign(
      body,
      objectWithDefined({
        name: input.name,
        organizationNumber: input.organizationNumber
      })
    );
  }

  if (input.firstName !== undefined || input.lastName !== undefined) {
    body.person = objectWithDefined({
      firstName: input.firstName,
      lastName: input.lastName
    });
  }

  let address = customerAddressBody(input);
  if (address !== undefined) body.address = address;

  if (input.emailContact !== undefined || input.emailBilling !== undefined) {
    body.email = objectWithDefined({
      contact: input.emailContact,
      billing: input.emailBilling
    });
  }

  return mergeAdditionalFields(body, input.additionalFields);
};

let validateCustomerCreateInput = (input: CustomerBodyInput & { customerId?: number }) => {
  if (input.customerId !== undefined) {
    throw finagoServiceError('customerId is only used when updating a customer.');
  }
  if (input.isCompany === undefined) {
    throw finagoServiceError('isCompany is required when creating a customer.');
  }

  rejectAdditionalFields(input.additionalFields, ['isCompany'], 'creating a customer');

  if (input.isCompany) {
    if (!hasText(input.name)) {
      throw finagoServiceError('name is required when creating a company customer.');
    }
    if (input.firstName !== undefined || input.lastName !== undefined) {
      throw finagoServiceError(
        'firstName and lastName cannot be used when creating a company customer.'
      );
    }
    rejectAdditionalFields(input.additionalFields, ['person'], 'creating a company customer');
    return;
  }

  if (!hasText(input.firstName) || !hasText(input.lastName)) {
    throw finagoServiceError(
      'firstName and lastName are required when creating a person customer.'
    );
  }
  if (input.name !== undefined || input.organizationNumber !== undefined) {
    throw finagoServiceError(
      'name and organizationNumber cannot be used when creating a person customer.'
    );
  }
  rejectAdditionalFields(
    input.additionalFields,
    ['name', 'organizationNumber'],
    'creating a person customer'
  );
};

let validateCustomerUpdateInput = (input: CustomerBodyInput & { customerId?: number }) => {
  requireInput(input.customerId, 'customerId');
  if (input.isCompany !== undefined) {
    throw finagoServiceError(
      'Finago customer updates do not support changing isCompany. Omit isCompany and update editable customer fields only.'
    );
  }
  rejectAdditionalFields(input.additionalFields, ['isCompany'], 'updating a customer');
};

let customerSortByValues = [
  'name:asc',
  'name:desc',
  'createdAt:asc',
  'createdAt:desc',
  'modifiedAt:asc',
  'modifiedAt:desc',
  'organizationNumber:asc',
  'organizationNumber:desc',
  'id:asc',
  'id:desc'
] as const;

let customerSortBySchema = z.enum(customerSortByValues);
let customerSortBySet = new Set<string>(customerSortByValues);

let listOnlyCustomerFields = [
  'limit',
  'organizationNumber',
  'isCompany',
  'isSupplier',
  'modifiedFrom',
  'createdFrom',
  'sortBy',
  'maxPages'
] as const;

let validateListCustomersInput = (input: {
  customerId?: number;
  limit?: number;
  organizationNumber?: string;
  isCompany?: boolean;
  isSupplier?: boolean;
  modifiedFrom?: string;
  createdFrom?: string;
  sortBy?: string;
  maxPages?: number;
}) => {
  if (input.sortBy !== undefined && !customerSortBySet.has(input.sortBy)) {
    throw finagoServiceError(`sortBy must be one of: ${customerSortByValues.join(', ')}.`);
  }

  if (input.customerId === undefined) return;

  let conflictingFields = listOnlyCustomerFields.filter(field => input[field] !== undefined);
  if (conflictingFields.length === 0) return;

  throw finagoServiceError(
    `Do not provide ${conflictingFields.join(', ')} when reading a customer by customerId.`
  );
};

export let finagoListCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'finago_list_customers',
  description:
    'List Finago customers and suppliers with filters for organization number, company/person, created or modified timestamp, sorting, and pagination.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      customerId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Read one customer by ID instead of listing customers.'),
      limit: z.number().int().min(1).max(100).optional().describe('Page size.'),
      organizationNumber: z.string().optional().describe('Filter by organization number.'),
      isCompany: z.boolean().optional().describe('Filter companies or private persons.'),
      isSupplier: z.boolean().optional().describe('Filter customers that are also suppliers.'),
      modifiedFrom: z.string().optional().describe('Filter by modified timestamp.'),
      createdFrom: z.string().optional().describe('Filter by created timestamp.'),
      sortBy: customerSortBySchema
        .optional()
        .describe(
          'Sort expression. Supported fields are name, createdAt, modifiedAt, organizationNumber, and id with asc or desc direction.'
        ),
      maxPages: maxPagesSchema
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema).describe('Customers returned by Finago.'),
      count: z.number().describe('Number of customers returned.'),
      pageCount: z.number().optional(),
      hasNextPage: z.boolean().optional(),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateListCustomersInput(ctx.input);

    let client = createClientFromContext(ctx);
    let result =
      ctx.input.customerId !== undefined
        ? {
            records: [
              await client.get(
                `/customers/${ctx.input.customerId}`,
                undefined,
                'read customer'
              )
            ],
            pageCount: 1,
            hasNextPage: false,
            nextLink: undefined
          }
        : await client.list(
            '/customers',
            {
              limit: ctx.input.limit,
              organizationNumber: ctx.input.organizationNumber,
              isCompany: ctx.input.isCompany,
              isSupplier: ctx.input.isSupplier,
              modifiedFrom: ctx.input.modifiedFrom,
              createdFrom: ctx.input.createdFrom,
              sortBy: ctx.input.sortBy
            },
            ctx.input.maxPages ?? 1,
            'list customers'
          );
    let customers = result.records.map(mapCustomer);

    return {
      output: {
        customers,
        count: customers.length,
        pageCount: result.pageCount,
        hasNextPage: result.hasNextPage,
        nextLink: result.nextLink
      },
      message: `Retrieved **${customers.length}** Finago customer(s).`
    };
  })
  .build();

export let finagoUpsertCustomer = SlateTool.create(spec, {
  name: 'Upsert Customer',
  key: 'finago_upsert_customer',
  description:
    'Create or update a Finago company/person customer. Company create requires isCompany=true and name; person create requires isCompany=false with firstName and lastName. Finago PATCH does not change customer type.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      operation: z.enum(['create', 'update']).describe('Create a new customer or update one.'),
      customerId: z.number().int().positive().optional().describe('Required for update.'),
      isCompany: z
        .boolean()
        .optional()
        .describe(
          'Required for create. True for a company customer, false for a person customer. Finago PATCH does not support changing this value.'
        ),
      name: nullableString(
        'Company customer name. Required when creating a company customer; not allowed when creating a person customer.'
      ),
      organizationNumber: nullableString(
        'Company organization number. Not allowed when creating a person customer.'
      ),
      firstName: nullableString(
        'Person first name. Required when creating a person customer; not allowed when creating a company customer.'
      ),
      lastName: nullableString(
        'Person last name. Required when creating a person customer; not allowed when creating a company customer.'
      ),
      externalReference: z
        .string()
        .max(100)
        .nullable()
        .optional()
        .describe('External system reference.'),
      isSupplier: z.boolean().optional().describe('Whether the customer is also a supplier.'),
      visitAddress: customerVisitAddressSchema.optional(),
      postalAddress: customerPostalAddressSchema.optional(),
      billingAddress: customerNamedAddressSchema.optional(),
      deliveryAddress: customerNamedAddressSchema.optional(),
      emailContact: nullableString('Contact email address.'),
      emailBilling: nullableString('Billing email address.'),
      phone: nullableString('Phone number.'),
      mobilePhone: z.string().max(25).nullable().optional().describe('Mobile phone number.'),
      additionalFields: additionalFieldsSchema
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    if (ctx.input.operation === 'create') {
      validateCustomerCreateInput(ctx.input);
    } else {
      validateCustomerUpdateInput(ctx.input);
    }

    let body = customerBody(ctx.input, ctx.input.operation);
    if (ctx.input.operation === 'update') {
      requireUpdateFields(body, 'customer');
    }

    let record =
      ctx.input.operation === 'create'
        ? await client.post('/customers', body, undefined, 'create customer')
        : await client.patch(
            `/customers/${ctx.input.customerId}`,
            body,
            undefined,
            'update customer'
          );
    let output = mapCustomer(record);

    return {
      output,
      message: `${ctx.input.operation === 'create' ? 'Created' : 'Updated'} Finago customer **${output.name ?? output.customerId ?? 'unknown'}**.`
    };
  })
  .build();
