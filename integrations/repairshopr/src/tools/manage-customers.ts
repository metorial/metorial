import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z.object({
  customerId: z.number().describe('Customer ID'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  fullname: z.string().optional().describe('Full name'),
  businessName: z.string().optional().describe('Business name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile number'),
  address: z.string().optional().describe('Street address'),
  address2: z.string().optional().describe('Address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  zip: z.string().optional().describe('ZIP/postal code'),
  notes: z.string().optional().describe('Customer notes'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let searchCustomers = SlateTool.create(spec, {
  name: 'Search Customers',
  key: 'search_customers',
  description: `Search and list customers in RepairShopr. Filter by name, email, business name, or use a general search query. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('General search query across customer fields'),
      firstname: z.string().optional().describe('Filter by first name'),
      lastname: z.string().optional().describe('Filter by last name'),
      businessName: z.string().optional().describe('Filter by business name'),
      email: z.string().optional().describe('Filter by email address'),
      includeDisabled: z.boolean().optional().describe('Include disabled customers'),
      sort: z.string().optional().describe('Sort order, e.g. "firstname ASC"'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalEntries: z.number().optional().describe('Total number of customers'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listCustomers({
      query: ctx.input.query,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      businessName: ctx.input.businessName,
      email: ctx.input.email,
      includeDisabled: ctx.input.includeDisabled,
      sort: ctx.input.sort,
      page: ctx.input.page
    });

    let customers = (result.customers || []).map((c: any) => ({
      customerId: c.id,
      firstname: c.firstname,
      lastname: c.lastname,
      fullname: c.fullname,
      businessName: c.business_name,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      address: c.address,
      address2: c.address_2,
      city: c.city,
      state: c.state,
      zip: c.zip,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        customers,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${customers.length}** customer(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific customer by their ID, including contacts, custom fields, and profile details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The customer ID to retrieve')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getCustomer(ctx.input.customerId);
    let c = result.customer || result;

    return {
      output: {
        customerId: c.id,
        firstname: c.firstname,
        lastname: c.lastname,
        fullname: c.fullname,
        businessName: c.business_name,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        address: c.address,
        address2: c.address_2,
        city: c.city,
        state: c.state,
        zip: c.zip,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Retrieved customer **${c.fullname || c.firstname || c.business_name || c.id}**.`
    };
  })
  .build();

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer record in RepairShopr. At minimum, provide a first name, last name, or business name.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      businessName: z.string().optional().describe('Business name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code'),
      notes: z.string().optional().describe('Customer notes'),
      getSms: z.boolean().optional().describe('Customer can receive SMS'),
      optOut: z.boolean().optional().describe('Customer has opted out of communications'),
      noEmail: z.boolean().optional().describe('Do not email this customer'),
      locationName: z.string().optional().describe('Location name'),
      referredBy: z.string().optional().describe('Referral source')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createCustomer(ctx.input);
    let c = result.customer || result;

    return {
      output: {
        customerId: c.id,
        firstname: c.firstname,
        lastname: c.lastname,
        fullname: c.fullname,
        businessName: c.business_name,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        address: c.address,
        address2: c.address_2,
        city: c.city,
        state: c.state,
        zip: c.zip,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Created customer **${c.fullname || c.firstname || c.business_name || c.id}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's information. Only the provided fields will be modified.`
})
  .input(
    z.object({
      customerId: z.number().describe('The customer ID to update'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      businessName: z.string().optional().describe('Business name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code'),
      notes: z.string().optional().describe('Customer notes'),
      getSms: z.boolean().optional().describe('Customer can receive SMS'),
      optOut: z.boolean().optional().describe('Customer has opted out of communications'),
      noEmail: z.boolean().optional().describe('Do not email this customer'),
      locationName: z.string().optional().describe('Location name'),
      referredBy: z.string().optional().describe('Referral source')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { customerId, ...updateData } = ctx.input;
    let result = await client.updateCustomer(customerId, updateData);
    let c = result.customer || result;

    return {
      output: {
        customerId: c.id,
        firstname: c.firstname,
        lastname: c.lastname,
        fullname: c.fullname,
        businessName: c.business_name,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        address: c.address,
        address2: c.address_2,
        city: c.city,
        state: c.state,
        zip: c.zip,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Updated customer **${c.fullname || c.firstname || c.business_name || c.id}**.`
    };
  })
  .build();

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer record from RepairShopr. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The customer ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: { success: true },
      message: `Deleted customer **${ctx.input.customerId}**.`
    };
  })
  .build();
