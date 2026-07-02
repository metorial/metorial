import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

let addressSchema = z
  .object({
    line1: z.string().optional().describe('Address line 1'),
    line2: z.string().optional().describe('Address line 2'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or province'),
    postalCode: z.string().optional().describe('Postal or ZIP code'),
    country: z.string().optional().describe('Two-letter country code (ISO 3166-1 alpha-2)')
  })
  .optional()
  .describe('Customer address');

let shippingSchema = z
  .object({
    name: z.string().describe('Recipient name'),
    phone: z.string().optional().describe('Recipient phone'),
    address: addressSchema
  })
  .optional()
  .describe('Customer shipping information');

export let manageCustomers = SlateTool.create(spec, {
  name: 'Manage Customers',
  key: 'manage_customers',
  description: `Create, retrieve, update, or delete Stripe customers. Use **action** to specify the operation. Customers are the core entity for tracking payments, subscriptions, and invoices.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID (required for get, update, delete)'),
      email: z.string().optional().describe('Customer email address'),
      name: z.string().optional().describe('Customer full name'),
      phone: z.string().optional().describe('Customer phone number'),
      description: z.string().optional().describe('Description of the customer'),
      address: addressSchema,
      shipping: shippingSchema,
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach to the customer'),
      paymentMethodId: z.string().optional().describe('Default payment method ID to set'),
      limit: z
        .number()
        .optional()
        .describe('Max number of results to return (for list, default 10)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination - customer ID to start after'),
      emailFilter: z.string().optional().describe('Filter customers by email (for list)')
    })
  )
  .output(
    z.object({
      customerId: z.string().optional().describe('Customer ID'),
      email: z.string().optional().nullable().describe('Customer email'),
      name: z.string().optional().nullable().describe('Customer name'),
      phone: z.string().optional().nullable().describe('Customer phone'),
      description: z.string().optional().nullable().describe('Customer description'),
      created: z.number().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the customer was deleted'),
      customers: z
        .array(
          z.object({
            customerId: z.string(),
            email: z.string().optional().nullable(),
            name: z.string().optional().nullable(),
            created: z.number().optional()
          })
        )
        .optional()
        .describe('List of customers (for list action)'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let params: Record<string, any> = {};
      if (ctx.input.email) params.email = ctx.input.email;
      if (ctx.input.name) params.name = ctx.input.name;
      if (ctx.input.phone) params.phone = ctx.input.phone;
      if (ctx.input.description) params.description = ctx.input.description;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;
      if (ctx.input.paymentMethodId) {
        params.payment_method = ctx.input.paymentMethodId;
        params.invoice_settings = { default_payment_method: ctx.input.paymentMethodId };
      }
      if (ctx.input.address) {
        params.address = {
          line1: ctx.input.address.line1,
          line2: ctx.input.address.line2,
          city: ctx.input.address.city,
          state: ctx.input.address.state,
          postal_code: ctx.input.address.postalCode,
          country: ctx.input.address.country
        };
      }
      if (ctx.input.shipping) {
        params.shipping = {
          name: ctx.input.shipping.name,
          phone: ctx.input.shipping.phone,
          address: ctx.input.shipping.address
            ? {
                line1: ctx.input.shipping.address.line1,
                line2: ctx.input.shipping.address.line2,
                city: ctx.input.shipping.address.city,
                state: ctx.input.shipping.address.state,
                postal_code: ctx.input.shipping.address.postalCode,
                country: ctx.input.shipping.address.country
              }
            : undefined
        };
      }

      let customer = await client.createCustomer(params);
      return {
        output: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          description: customer.description,
          created: customer.created
        },
        message: `Created customer **${customer.name || customer.email || customer.id}**`
      };
    }

    if (action === 'get') {
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for get action');
      let customer = await client.getCustomer(ctx.input.customerId);
      return {
        output: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          description: customer.description,
          created: customer.created
        },
        message: `Retrieved customer **${customer.name || customer.email || customer.id}**`
      };
    }

    if (action === 'update') {
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for update action');
      let params: Record<string, any> = {};
      if (ctx.input.email !== undefined) params.email = ctx.input.email;
      if (ctx.input.name !== undefined) params.name = ctx.input.name;
      if (ctx.input.phone !== undefined) params.phone = ctx.input.phone;
      if (ctx.input.description !== undefined) params.description = ctx.input.description;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;
      if (ctx.input.paymentMethodId) {
        params.invoice_settings = { default_payment_method: ctx.input.paymentMethodId };
      }
      if (ctx.input.address) {
        params.address = {
          line1: ctx.input.address.line1,
          line2: ctx.input.address.line2,
          city: ctx.input.address.city,
          state: ctx.input.address.state,
          postal_code: ctx.input.address.postalCode,
          country: ctx.input.address.country
        };
      }

      let customer = await client.updateCustomer(ctx.input.customerId, params);
      return {
        output: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          description: customer.description,
          created: customer.created
        },
        message: `Updated customer **${customer.name || customer.email || customer.id}**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.customerId)
        throw stripeServiceError('customerId is required for delete action');
      let result = await client.deleteCustomer(ctx.input.customerId);
      return {
        output: {
          customerId: result.id,
          deleted: result.deleted
        },
        message: `Deleted customer **${ctx.input.customerId}**`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.emailFilter) params.email = ctx.input.emailFilter;

    let result = await client.listCustomers(params);
    return {
      output: {
        customers: result.data.map((c: any) => ({
          customerId: c.id,
          email: c.email,
          name: c.name,
          created: c.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** customer(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
