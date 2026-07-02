import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let exemptRegionSchema = z.object({
  country: z.string().describe('Two-letter ISO country code (e.g. US)'),
  state: z.string().describe('Two-letter state code (e.g. NY)')
});

let customerOutput = z.object({
  customerId: z.string().describe('Customer identifier'),
  exemptionType: z
    .string()
    .describe('Exemption type: wholesale, government, other, or non_exempt'),
  name: z.string().describe('Customer name'),
  exemptRegions: z
    .array(exemptRegionSchema)
    .optional()
    .describe('Regions where the customer is tax exempt'),
  country: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional()
});

let mapCustomerOutput = (customer: any) => ({
  customerId: customer.customer_id,
  exemptionType: customer.exemption_type,
  name: customer.name,
  exemptRegions: customer.exempt_regions,
  country: customer.country,
  state: customer.state,
  zip: customer.zip,
  city: customer.city,
  street: customer.street
});

// ---- List Customers ----

export let listCustomers = SlateTool.create(spec, {
  name: 'List Exempt Customers',
  key: 'list_customers',
  description: `List all exempt customers configured in TaxJar. Returns customer details including exemption type and exempt regions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customers: z.array(customerOutput).describe('List of exempt customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let customers = await client.listCustomers();

    return {
      output: { customers: customers.map(mapCustomerOutput) },
      message: `Found **${customers.length}** exempt customer(s).`
    };
  })
  .build();

// ---- Get Customer ----

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Exempt Customer',
  key: 'get_customer',
  description: `Retrieve a single exempt customer by their customer ID. Returns full customer details including exemption type and exempt regions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID to look up')
    })
  )
  .output(customerOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let customer = await client.showCustomer(ctx.input.customerId);

    return {
      output: mapCustomerOutput(customer),
      message: `Retrieved customer **${customer.customer_id}** (${customer.name}): ${customer.exemption_type} exemption.`
    };
  })
  .build();

// ---- Create Customer ----

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Exempt Customer',
  key: 'create_customer',
  description: `Create a new exempt customer in TaxJar. Once created, pass the customer ID to tax calculations or transactions to automatically apply exemptions.`,
  instructions: [
    'If exemptionType is wholesale, government, or other, any order-level or line item sales tax must be zero.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Unique customer identifier'),
      exemptionType: z
        .enum(['wholesale', 'government', 'other', 'non_exempt'])
        .describe('Type of tax exemption'),
      name: z.string().describe('Customer name'),
      exemptRegions: z
        .array(exemptRegionSchema)
        .optional()
        .describe('Regions where the customer is exempt. Omit to make exempt everywhere.'),
      country: z.string().optional().describe('Customer country code'),
      state: z.string().optional().describe('Customer state code'),
      zip: z.string().optional().describe('Customer ZIP code'),
      city: z.string().optional().describe('Customer city'),
      street: z.string().optional().describe('Customer street address')
    })
  )
  .output(customerOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let customer = await client.createCustomer({
      customer_id: ctx.input.customerId,
      exemption_type: ctx.input.exemptionType,
      name: ctx.input.name,
      exempt_regions: ctx.input.exemptRegions,
      country: ctx.input.country,
      state: ctx.input.state,
      zip: ctx.input.zip,
      city: ctx.input.city,
      street: ctx.input.street
    });

    return {
      output: mapCustomerOutput(customer),
      message: `Created exempt customer **${customer.customer_id}** (${customer.name}): ${customer.exemption_type}.`
    };
  })
  .build();

// ---- Update Customer ----

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Exempt Customer',
  key: 'update_customer',
  description: `Update an existing exempt customer in TaxJar. Provide only the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID to update'),
      exemptionType: z.enum(['wholesale', 'government', 'other', 'non_exempt']).optional(),
      name: z.string().optional(),
      exemptRegions: z.array(exemptRegionSchema).optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional()
    })
  )
  .output(customerOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let customer = await client.updateCustomer({
      customer_id: ctx.input.customerId,
      exemption_type: ctx.input.exemptionType,
      name: ctx.input.name,
      exempt_regions: ctx.input.exemptRegions,
      country: ctx.input.country,
      state: ctx.input.state,
      zip: ctx.input.zip,
      city: ctx.input.city,
      street: ctx.input.street
    });

    return {
      output: mapCustomerOutput(customer),
      message: `Updated customer **${customer.customer_id}** (${customer.name}).`
    };
  })
  .build();

// ---- Delete Customer ----

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Exempt Customer',
  key: 'delete_customer',
  description: `Delete an exempt customer from TaxJar. The customer will no longer be available for exemption lookups.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID to delete')
    })
  )
  .output(customerOutput)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let customer = await client.deleteCustomer(ctx.input.customerId);

    return {
      output: mapCustomerOutput(customer),
      message: `Deleted customer **${customer.customer_id}**.`
    };
  })
  .build();
