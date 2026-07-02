import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      customerCode: z.string().describe('Unique customer code'),
      customerId: z.number().describe('Customer ID'),
      email: z.string().describe('Customer email'),
      firstName: z.string().nullable().describe('Customer first name'),
      lastName: z.string().nullable().describe('Customer last name'),
      phone: z.string().nullable().describe('Customer phone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createCustomer({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone,
      metadata: ctx.input.metadata
    });

    let cust = result.data;

    return {
      output: {
        customerCode: cust.customer_code,
        customerId: cust.id,
        email: cust.email,
        firstName: cust.first_name ?? null,
        lastName: cust.last_name ?? null,
        phone: cust.phone ?? null
      },
      message: `Customer created: **${cust.email}** (${cust.customer_code})`
    };
  })
  .build();

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
  .output(
    z.object({
      customerCode: z.string().describe('Unique customer code'),
      customerId: z.number().describe('Customer ID'),
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.getCustomer(ctx.input.emailOrCode);
    let cust = result.data;

    return {
      output: {
        customerCode: cust.customer_code,
        customerId: cust.id,
        email: cust.email,
        firstName: cust.first_name ?? null,
        lastName: cust.last_name ?? null,
        phone: cust.phone ?? null,
        riskAction: cust.risk_action ?? null,
        metadata: cust.metadata,
        totalTransactions: cust.total_transactions,
        totalTransactionValue: cust.total_transaction_value
      },
      message: `Customer **${cust.email}** (${cust.customer_code}): ${cust.total_transactions ?? 0} transactions.`
    };
  })
  .build();

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
  .output(
    z.object({
      customerCode: z.string().describe('Customer code'),
      email: z.string().describe('Customer email'),
      firstName: z.string().nullable().describe('Customer first name'),
      lastName: z.string().nullable().describe('Customer last name'),
      phone: z.string().nullable().describe('Customer phone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.updateCustomer(ctx.input.customerCode, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone,
      metadata: ctx.input.metadata
    });

    if (ctx.input.riskAction) {
      await client.setCustomerRiskAction(ctx.input.customerCode, ctx.input.riskAction);
    }

    let cust = result.data;

    return {
      output: {
        customerCode: cust.customer_code,
        email: cust.email,
        firstName: cust.first_name ?? null,
        lastName: cust.last_name ?? null,
        phone: cust.phone ?? null
      },
      message: `Customer **${cust.email}** updated.${ctx.input.riskAction ? ` Risk action set to **${ctx.input.riskAction}**.` : ''}`
    };
  })
  .build();

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
      perPage: z.number().optional().describe('Number of records per page (default 50)'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerCode: z.string().describe('Customer code'),
          customerId: z.number().describe('Customer ID'),
          email: z.string().describe('Customer email'),
          firstName: z.string().nullable().describe('First name'),
          lastName: z.string().nullable().describe('Last name'),
          phone: z.string().nullable().describe('Phone'),
          riskAction: z.string().nullable().describe('Risk action')
        })
      ),
      totalCount: z.number().describe('Total customers'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listCustomers({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let customers = (result.data ?? []).map((c: any) => ({
      customerCode: c.customer_code,
      customerId: c.id,
      email: c.email,
      firstName: c.first_name ?? null,
      lastName: c.last_name ?? null,
      phone: c.phone ?? null,
      riskAction: c.risk_action ?? null
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        customers,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? customers.length}** customers (page ${meta.page ?? 1}).`
    };
  })
  .build();
