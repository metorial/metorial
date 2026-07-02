import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaveClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    addressLine1: z.string().optional().describe('Street address line 1'),
    addressLine2: z.string().optional().describe('Street address line 2'),
    city: z.string().optional().describe('City'),
    postalCode: z.string().optional().describe('Postal/ZIP code'),
    countryCode: z.string().optional().describe('ISO country code (e.g., "US", "CA")'),
    provinceCode: z.string().optional().describe('Province/state code (e.g., "CA-ON")')
  })
  .describe('Address');

let shippingSchema = z
  .object({
    name: z.string().optional().describe('Shipping contact name'),
    phone: z.string().optional().describe('Shipping contact phone'),
    instructions: z.string().optional().describe('Shipping instructions'),
    address: addressSchema.optional().describe('Shipping address')
  })
  .describe('Shipping details');

let customerOutputSchema = z.object({
  customerId: z.string().describe('Unique identifier of the customer'),
  name: z.string().describe('Customer/company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  displayId: z.string().optional().describe('Display identifier'),
  email: z.string().optional().describe('Email address'),
  mobile: z.string().optional().describe('Mobile number'),
  phone: z.string().optional().describe('Phone number'),
  fax: z.string().optional().describe('Fax number'),
  tollFree: z.string().optional().describe('Toll-free number'),
  website: z.string().optional().describe('Website URL'),
  internalNotes: z.string().optional().describe('Internal notes'),
  currency: z
    .object({
      code: z.string().optional(),
      symbol: z.string().optional(),
      name: z.string().optional()
    })
    .optional()
    .describe('Currency preference'),
  address: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      province: z
        .object({ code: z.string().optional(), name: z.string().optional() })
        .optional(),
      country: z
        .object({ code: z.string().optional(), name: z.string().optional() })
        .optional()
    })
    .optional()
    .describe('Billing address'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

let mapCustomer = (c: any) => ({
  customerId: c.id,
  name: c.name,
  firstName: c.firstName,
  lastName: c.lastName,
  displayId: c.displayId,
  email: c.email,
  mobile: c.mobile,
  phone: c.phone,
  fax: c.fax,
  tollFree: c.tollFree,
  website: c.website,
  internalNotes: c.internalNotes,
  currency: c.currency,
  address: c.address,
  createdAt: c.createdAt,
  modifiedAt: c.modifiedAt
});

// --- List Customers ---

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `List customers for a specific Wave business. Supports pagination for businesses with many customers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.string().describe('ID of the business to list customers for'),
      page: z.number().optional().describe('Page number (starts at 1, default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      customers: z.array(customerOutputSchema).describe('List of customers'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.listCustomers(
      ctx.input.businessId,
      ctx.input.page || 1,
      ctx.input.pageSize || 20
    );

    return {
      output: {
        customers: result.items.map(mapCustomer),
        currentPage: result.pageInfo.currentPage,
        totalPages: result.pageInfo.totalPages,
        totalCount: result.pageInfo.totalCount
      },
      message: `Found **${result.pageInfo.totalCount}** customers (page ${result.pageInfo.currentPage} of ${result.pageInfo.totalPages}).`
    };
  })
  .build();

// --- Create Customer ---

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer record for a Wave business. At minimum a business ID and customer name are required. Optionally include contact details, address, shipping info, and currency preference.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      businessId: z.string().describe('ID of the business to create the customer for'),
      name: z.string().describe('Customer or company name'),
      firstName: z.string().optional().describe('First name of primary contact'),
      lastName: z.string().optional().describe('Last name of primary contact'),
      displayId: z.string().optional().describe('Custom display identifier'),
      email: z.string().optional().describe('Email address'),
      mobile: z.string().optional().describe('Mobile number'),
      phone: z.string().optional().describe('Phone number'),
      fax: z.string().optional().describe('Fax number'),
      tollFree: z.string().optional().describe('Toll-free number'),
      website: z.string().optional().describe('Website URL'),
      internalNotes: z
        .string()
        .optional()
        .describe('Internal notes (not visible to customer)'),
      currency: z.string().optional().describe('ISO 4217 currency code (e.g., "USD", "CAD")'),
      address: addressSchema.optional().describe('Billing address'),
      shippingDetails: shippingSchema.optional().describe('Shipping details')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.createCustomer(ctx.input);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to create customer: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapCustomer(result.data),
      message: `Created customer **${result.data.name}** (${result.data.id}).`
    };
  })
  .build();

// --- Update Customer ---

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's details. Only the fields you provide will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to update'),
      name: z.string().optional().describe('Updated customer or company name'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      displayId: z.string().optional().describe('Updated display identifier'),
      email: z.string().optional().describe('Updated email address'),
      mobile: z.string().optional().describe('Updated mobile number'),
      phone: z.string().optional().describe('Updated phone number'),
      fax: z.string().optional().describe('Updated fax number'),
      tollFree: z.string().optional().describe('Updated toll-free number'),
      website: z.string().optional().describe('Updated website URL'),
      internalNotes: z.string().optional().describe('Updated internal notes'),
      currency: z.string().optional().describe('Updated ISO 4217 currency code'),
      address: addressSchema.optional().describe('Updated billing address'),
      shippingDetails: shippingSchema.optional().describe('Updated shipping details')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let { customerId, ...rest } = ctx.input;
    let result = await client.patchCustomer({ id: customerId, ...rest });

    if (!result.didSucceed) {
      throw new Error(
        `Failed to update customer: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: mapCustomer(result.data),
      message: `Updated customer **${result.data.name}** (${result.data.id}).`
    };
  })
  .build();

// --- Delete Customer ---

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer from a Wave business. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaveClient(ctx.auth.token);
    let result = await client.deleteCustomer(ctx.input.customerId);

    if (!result.didSucceed) {
      throw new Error(
        `Failed to delete customer: ${result.inputErrors.map(e => e.message).join(', ')}`
      );
    }

    return {
      output: { success: true },
      message: `Deleted customer \`${ctx.input.customerId}\`.`
    };
  })
  .build();
