import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { customerOutput } from '../lib/mapping';
import {
  exactId,
  optionalNumericId,
  pagination,
  record,
  records,
  sanitizeMetadata,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createCustomerOutput = z.object({
  customerCode: z.string().describe('Unique customer code'),
  customerId: z.number().optional().describe('Customer ID'),
  exactCustomerId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  email: z.string().describe('Customer email'),
  firstName: z.string().nullable().describe('Customer first name'),
  lastName: z.string().nullable().describe('Customer last name'),
  phone: z.string().nullable().describe('Customer phone')
});

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer record on your Paystack integration. Customers are used to track payment history and manage recurring billing.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Customer email address'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      phone: z.string().optional().describe('Customer phone number'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata for the customer')
    })
  )
  .output(createCustomerOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createCustomer(ctx.input);
    const customer = record(result.data);
    const output = {
      ...customerOutput(customer),
      customerId: optionalNumericId(customer.id),
      exactCustomerId: exactId(customer.id)
    };
    return {
      output: validateOutput(createCustomerOutput, output),
      message: 'Customer record created or returned by Paystack.'
    };
  })
  .build();
const getCustomerOutput = z.object({
  customerCode: z.string().describe('Unique customer code'),
  customerId: z.number().optional().describe('Customer ID'),
  exactCustomerId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  email: z.string().describe('Customer email'),
  firstName: z.string().nullable().describe('Customer first name'),
  lastName: z.string().nullable().describe('Customer last name'),
  phone: z.string().nullable().describe('Customer phone'),
  riskAction: z.string().nullable().describe('Risk action (default, allow, deny)'),
  metadata: z.any().optional().describe('Customer metadata'),
  totalTransactions: z.number().optional().describe('Total number of transactions'),
  totalTransactionValue: z
    .array(z.any())
    .optional()
    .describe('Total transaction values per currency')
});

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Fetch details for a single customer by email or customer code. Returns full customer profile including transactions and subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailOrCode: z.string().describe('Customer email address or customer code')
    })
  )
  .output(getCustomerOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.getCustomer(ctx.input.emailOrCode);
    const customer = record(result.data);
    const output = {
      ...customerOutput(customer),
      customerId: optionalNumericId(customer.id),
      exactCustomerId: exactId(customer.id),
      riskAction: customer.risk_action ?? null,
      metadata: sanitizeMetadata(customer.metadata, ctx.auth.token),
      totalTransactions: customer.total_transactions,
      totalTransactionValue: sanitizeMetadata(customer.total_transaction_value, ctx.auth.token)
    };
    return {
      output: validateOutput(getCustomerOutput, output),
      message: 'Customer details retrieved.'
    };
  })
  .build();
const updateCustomerOutput = z.object({
  customerCode: z.string().describe('Customer code'),
  email: z.string().describe('Customer email'),
  firstName: z.string().nullable().describe('Customer first name'),
  lastName: z.string().nullable().describe('Customer last name'),
  phone: z.string().nullable().describe('Customer phone')
});

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's details. Can modify name, phone, and metadata. Can also whitelist or blacklist a customer by setting the risk action.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerCode: z.string().describe('Customer code of the customer to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated metadata'),
      riskAction: z
        .enum(['default', 'allow', 'deny'])
        .optional()
        .describe('Set risk action: allow (whitelist), deny (blacklist), or default')
    })
  )
  .output(updateCustomerOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.updateCustomerProfile(ctx.input.customerCode, ctx.input);
    const output = customerOutput(record(result.data));
    return {
      output: validateOutput(updateCustomerOutput, output),
      message: 'Customer update confirmed.'
    };
  })
  .build();
const listCustomersOutput = z.object({
  customers: z.array(
    z.object({
      customerCode: z.string().describe('Customer code'),
      customerId: z.number().optional().describe('Customer ID'),
      exactCustomerId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      email: z.string().describe('Customer email'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      phone: z.string().nullable().describe('Phone'),
      riskAction: z.string().nullable().describe('Risk action')
    })
  ),
  totalCount: z.number().optional().describe('Total customers'),
  currentPage: z.number().optional().describe('Current page'),
  totalPages: z.number().optional().describe('Total pages'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a paginated list of customers on your integration. Supports filtering by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      useCursor: z.boolean().optional().describe('Use cursor pagination; omit page when true'),
      next: z.string().optional().describe('Next cursor from the prior response'),
      previous: z.string().optional().describe('Previous cursor from the prior response'),
      perPage: z.number().optional().describe('Number of records per page (default 50)'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listCustomersOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listCustomers(ctx.input);
    const output = {
      customers: records(result.data).map(item => ({
        ...customerOutput(item),
        customerId: optionalNumericId(item.id),
        exactCustomerId: exactId(item.id),
        riskAction: item.risk_action ?? null
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listCustomersOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
