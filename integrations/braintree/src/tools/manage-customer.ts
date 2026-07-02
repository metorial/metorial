import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { buildXml, parseXml } from '../lib/xml';
import { spec } from '../spec';

let customerSchema = z.object({
  customerId: z.string().describe('Customer ID'),
  firstName: z.string().optional().nullable().describe('First name'),
  lastName: z.string().optional().nullable().describe('Last name'),
  email: z.string().optional().nullable().describe('Email address'),
  phone: z.string().optional().nullable().describe('Phone number'),
  company: z.string().optional().nullable().describe('Company name'),
  website: z.string().optional().nullable().describe('Website URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Creates a new customer record in the Braintree vault. Customers can store multiple payment methods and have associated transactions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe('Custom ID for the customer. If omitted, Braintree generates one.'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      email: z.string().optional().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone number'),
      company: z.string().optional().describe('Customer company name'),
      website: z.string().optional().describe('Customer website')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let data: Record<string, any> = {};
    if (ctx.input.customerId) data.id = ctx.input.customerId;
    if (ctx.input.firstName) data.firstName = ctx.input.firstName;
    if (ctx.input.lastName) data.lastName = ctx.input.lastName;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.company) data.company = ctx.input.company;
    if (ctx.input.website) data.website = ctx.input.website;

    let body = buildXml('customer', data);
    let xml = await rest.post('/customers', body);
    let parsed = parseXml(xml);
    let customer = parsed.customer || parsed;

    return {
      output: {
        customerId: customer.id || '',
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        website: customer.website,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      },
      message: `Customer \`${customer.id}\` created${customer.email ? ` (${customer.email})` : ''}`
    };
  })
  .build();

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Updates an existing Braintree customer's information. Only the provided fields will be updated; other fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The customer ID to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      phone: z.string().optional().describe('New phone number'),
      company: z.string().optional().describe('New company name'),
      website: z.string().optional().describe('New website')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let data: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) data.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.company !== undefined) data.company = ctx.input.company;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;

    let body = buildXml('customer', data);
    let xml = await rest.put(`/customers/${ctx.input.customerId}`, body);
    let parsed = parseXml(xml);
    let customer = parsed.customer || parsed;

    return {
      output: {
        customerId: customer.id || ctx.input.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        website: customer.website,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      },
      message: `Customer \`${ctx.input.customerId}\` updated`
    };
  })
  .build();

export let findCustomer = SlateTool.create(spec, {
  name: 'Find Customer',
  key: 'find_customer',
  description: `Retrieves a Braintree customer by ID, including their stored payment methods and associated information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The customer ID to look up')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Customer ID'),
      firstName: z.string().optional().nullable(),
      lastName: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      paymentMethods: z
        .array(
          z.object({
            token: z.string().optional(),
            type: z.string().optional(),
            last4: z.string().optional().nullable(),
            cardType: z.string().optional().nullable(),
            expirationDate: z.string().optional().nullable(),
            isDefault: z.boolean().optional(),
            payerEmail: z.string().optional().nullable()
          })
        )
        .optional()
        .describe('Stored payment methods')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.get(`/customers/${ctx.input.customerId}`);
    let parsed = parseXml(xml);
    let customer = parsed.customer || parsed;

    let paymentMethods: any[] = [];
    if (customer.creditCards && Array.isArray(customer.creditCards)) {
      for (let card of customer.creditCards) {
        paymentMethods.push({
          token: card.token,
          type: 'credit_card',
          last4: card.last4,
          cardType: card.cardType,
          expirationDate: card.expirationDate,
          isDefault: card.default === true || card.default === 'true',
          payerEmail: null
        });
      }
    }
    if (customer.paypalAccounts && Array.isArray(customer.paypalAccounts)) {
      for (let pp of customer.paypalAccounts) {
        paymentMethods.push({
          token: pp.token,
          type: 'paypal',
          last4: null,
          cardType: null,
          expirationDate: null,
          isDefault: pp.default === true || pp.default === 'true',
          payerEmail: pp.email
        });
      }
    }

    return {
      output: {
        customerId: customer.id || ctx.input.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        website: customer.website,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        paymentMethods
      },
      message: `Customer \`${ctx.input.customerId}\`${customer.email ? ` (${customer.email})` : ''} — ${paymentMethods.length} payment method(s)`
    };
  })
  .build();

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Deletes a Braintree customer and all their associated payment methods. All recurring billing subscriptions will be canceled.
This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The customer ID to delete')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('The deleted customer ID'),
      deleted: z.boolean().describe('Whether the customer was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    await rest.delete(`/customers/${ctx.input.customerId}`);

    return {
      output: {
        customerId: ctx.input.customerId,
        deleted: true
      },
      message: `Customer \`${ctx.input.customerId}\` deleted`
    };
  })
  .build();
