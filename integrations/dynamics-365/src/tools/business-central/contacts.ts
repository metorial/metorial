import { SlateTool } from 'slates';
import { z } from 'zod';
import { businessCentralEntityPath } from '../../lib/business-central/client';
import { businessCentralValidationError } from '../../lib/business-central/errors';
import { spec } from '../../spec';
import {
  addressSchema,
  type BusinessCentralContext,
  booleanValue,
  buildODataParams,
  compactRecord,
  companyInputFields,
  companyPath,
  containsFilter,
  createClient,
  dateFromFilter,
  equalityFilter,
  listInputFields,
  mapAddress,
  numberValue,
  type ODataInput,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  resolveCompanyId,
  stringValue
} from './shared';

type PartyContext = BusinessCentralContext & {
  input: BusinessCentralContext['input'] &
    ODataInput & {
      customerId?: string;
      vendorId?: string;
      search?: string;
      updatedSince?: string;
      blocked?: string;
    };
};

let nestedFilterSchemaVersionParams = (search: string | undefined) =>
  search?.trim() ? { $schemaversion: '2.1' } : {};

let defaultPartySearchFields = ['displayName', 'number', 'email', 'phoneNumber'];
let vendorSearchFields = ['displayName'];
let vendorBlockedValues = [' ', 'Payment', 'All'] as const;

type ListPartiesOptions = {
  usesNestedSearchFilter?: boolean;
  searchFields?: string[];
  blockedValues?: readonly string[];
};

let validateBlockedFilter = (
  value: string | undefined,
  allowedValues: readonly string[] | undefined,
  label: string
) => {
  if (value === undefined || !allowedValues) return;
  if (allowedValues.includes(value)) return;

  throw businessCentralValidationError(
    `Business Central ${label} blocked filter must be one of: ${allowedValues
      .map(allowedValue => `"${allowedValue}"`)
      .join(', ')}.`
  );
};

let partySchema = z.object({
  id: z.string().optional().describe('Business Central record GUID.'),
  number: z.string().optional().describe('Business Central customer/vendor number.'),
  displayName: z.string().optional().describe('Display name.'),
  type: z.string().optional().describe('Business Central party type when returned.'),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),
  currencyId: z.string().optional(),
  currencyCode: z.string().optional(),
  paymentTermsId: z.string().optional(),
  shipmentMethodId: z.string().optional(),
  blocked: z.string().optional(),
  balance: z.number().optional().describe('Vendor balance when returned.'),
  balanceDue: z.number().optional().describe('Customer balance due when returned.'),
  creditLimit: z.number().optional().describe('Customer credit limit when returned.'),
  lastModifiedDateTime: z.string().optional(),
  address: addressSchema.optional(),
  record: rawRecordSchema
});

let vendorSchema = partySchema.extend({
  irs1099Code: z.string().optional().describe('Vendor 1099 code when returned.'),
  paymentMethodId: z.string().optional().describe('Vendor payment method GUID.'),
  taxLiable: z.boolean().optional().describe('Whether the vendor is liable for sales tax.')
});

let mapParty = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    number: stringValue(record, 'number'),
    displayName: stringValue(record, 'displayName'),
    type: stringValue(record, 'type'),
    phoneNumber: stringValue(record, 'phoneNumber'),
    email: stringValue(record, 'email'),
    website: stringValue(record, 'website'),
    taxRegistrationNumber: stringValue(record, 'taxRegistrationNumber'),
    currencyId: stringValue(record, 'currencyId'),
    currencyCode: stringValue(record, 'currencyCode'),
    paymentTermsId: stringValue(record, 'paymentTermsId'),
    shipmentMethodId: stringValue(record, 'shipmentMethodId'),
    blocked: stringValue(record, 'blocked'),
    balance: numberValue(record, 'balance'),
    balanceDue: numberValue(record, 'balanceDue'),
    creditLimit: numberValue(record, 'creditLimit'),
    lastModifiedDateTime: stringValue(record, 'lastModifiedDateTime'),
    address: mapAddress(record)
  }),
  record
});

let mapVendor = (record: Record<string, unknown>) => ({
  ...mapParty(record),
  ...compactRecord({
    irs1099Code: stringValue(record, 'irs1099Code'),
    paymentMethodId: stringValue(record, 'paymentMethodId'),
    taxLiable: booleanValue(record, 'taxLiable')
  })
});

let listParties = async (
  ctx: PartyContext,
  kind: 'customers' | 'vendors',
  options: ListPartiesOptions = {}
) => {
  let client = createClient(ctx);
  let companyId = resolveCompanyId(ctx);
  let input = ctx.input;
  validateBlockedFilter(input.blocked, options.blockedValues, kind.slice(0, -1));
  let { params, page } = buildODataParams(ctx, input, [
    containsFilter(options.searchFields ?? defaultPartySearchFields, input.search),
    dateFromFilter('lastModifiedDateTime', input.updatedSince),
    equalityFilter('blocked', input.blocked)
  ]);
  if (options.usesNestedSearchFilter) {
    Object.assign(params, nestedFilterSchemaVersionParams(input.search));
  }
  let response = await client.getList<Record<string, unknown>>(
    `list ${kind}`,
    `/${companyPath(companyId)}/${kind}`,
    params
  );
  let records = response.value!.map(kind === 'vendors' ? mapVendor : mapParty);

  return {
    records,
    page: pageSummary(response, page)
  };
};

let getParty = async (ctx: PartyContext, kind: 'customers' | 'vendors', id: string) => {
  let client = createClient(ctx);
  let companyId = resolveCompanyId(ctx);
  let record = await client.getData<Record<string, unknown>>(
    `get ${kind.slice(0, -1)}`,
    `/${companyPath(companyId)}/${businessCentralEntityPath(kind, id)}`
  );

  return kind === 'vendors' ? mapVendor(record) : mapParty(record);
};

export let listCustomers = SlateTool.create(spec, {
  name: 'List Business Central Customers',
  key: 'list_customers',
  description:
    'List Business Central customers with bounded OData pagination, search, update timestamp, blocked-state, and advanced OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      search: z
        .string()
        .optional()
        .describe('Search customer display name, number, email, or phone number.'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return customers modified at or after this ISO timestamp.'),
      blocked: z.string().optional().describe('Filter by upstream blocked value.')
    })
  )
  .output(
    z.object({
      customers: z
        .array(partySchema)
        .describe('Customer records returned by Business Central.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await listParties(ctx as PartyContext, 'customers', {
      usesNestedSearchFilter: true
    });

    return {
      output: {
        customers: result.records,
        page: result.page
      },
      message: `Found **${result.records.length}** Business Central customer record(s).`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Business Central Customer',
  key: 'get_customer',
  description: 'Retrieve one Business Central customer by company and customer GUID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      customerId: z.string().describe('Business Central customer GUID.')
    })
  )
  .output(partySchema)
  .handleInvocation(async ctx => {
    let customer = await getParty(ctx as PartyContext, 'customers', ctx.input.customerId);

    return {
      output: customer,
      message: `Retrieved Business Central customer **${customer.displayName ?? customer.number ?? ctx.input.customerId}**.`
    };
  })
  .build();

export let listVendors = SlateTool.create(spec, {
  name: 'List Business Central Vendors',
  key: 'list_vendors',
  description:
    'List Business Central vendors with bounded OData pagination, search, update timestamp, blocked-state, and advanced OData filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      ...listInputFields,
      search: z
        .string()
        .optional()
        .describe(
          'Search vendor display name. For number, email, or phone filters, provide a documented OData expression in odataFilter.'
        ),
      updatedSince: z
        .string()
        .optional()
        .describe('Return vendors modified at or after this ISO timestamp.'),
      blocked: z
        .string()
        .optional()
        .describe(
          'Filter by documented Business Central vendor blocked value: " ", "Payment", or "All".'
        )
    })
  )
  .output(
    z.object({
      vendors: z.array(vendorSchema).describe('Vendor records returned by Business Central.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await listParties(ctx as PartyContext, 'vendors', {
      usesNestedSearchFilter: true,
      searchFields: vendorSearchFields,
      blockedValues: vendorBlockedValues
    });

    return {
      output: {
        vendors: result.records,
        page: result.page
      },
      message: `Found **${result.records.length}** Business Central vendor record(s).`
    };
  })
  .build();

export let getVendor = SlateTool.create(spec, {
  name: 'Get Business Central Vendor',
  key: 'get_vendor',
  description: 'Retrieve one Business Central vendor by company and vendor GUID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...companyInputFields,
      vendorId: z.string().describe('Business Central vendor GUID.')
    })
  )
  .output(vendorSchema)
  .handleInvocation(async ctx => {
    let vendor = await getParty(ctx as PartyContext, 'vendors', ctx.input.vendorId);

    return {
      output: vendor,
      message: `Retrieved Business Central vendor **${vendor.displayName ?? vendor.number ?? ctx.input.vendorId}**.`
    };
  })
  .build();
