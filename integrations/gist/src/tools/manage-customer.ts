import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue } from '../lib/response';
import { spec } from '../spec';

let addressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional()
});

export let manageCustomer = SlateTool.create(spec, {
  name: 'Manage E-Commerce Customer',
  key: 'manage_customer',
  description: `Create, update, or retrieve an e-commerce customer in Gist. Customers have billing/shipping addresses and are linked to Gist contacts.`
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get']).describe('Action to perform'),
      customerId: z
        .string()
        .optional()
        .describe('Customer external ID (required for all actions)'),
      storeId: z
        .string()
        .optional()
        .describe(
          'Store ID, required for all actions. Call manage_store with action list to discover stores.'
        ),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      billingAddress: addressSchema.optional().describe('Billing address'),
      shippingAddress: addressSchema.optional().describe('Shipping address')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      customerId: z.string(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let storeId = requireValue(
      ctx.input.storeId,
      'storeId; call manage_store with action list'
    );
    let client = new GistClient({ token: ctx.auth.token });

    let mapAddress = (addr: any) => {
      if (!addr) return undefined;
      return {
        first_name: addr.firstName,
        last_name: addr.lastName,
        company: addr.company,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        state: addr.province,
        postcode: addr.zip,
        country: addr.country,
        phone: addr.phone
      };
    };

    if (ctx.input.action === 'create') {
      requireValue(ctx.input.customerId, 'Customer external ID');
      requireValue(ctx.input.email, 'Customer email');
    }
    switch (ctx.input.action) {
      case 'create': {
        let body: Record<string, any> = {};
        if (ctx.input.customerId) body.customer_id = ctx.input.customerId;
        if (ctx.input.email) body.email_address = ctx.input.email;
        if (ctx.input.firstName) body.first_name = ctx.input.firstName;
        if (ctx.input.lastName) body.last_name = ctx.input.lastName;
        if (ctx.input.billingAddress)
          body.billing_address = mapAddress(ctx.input.billingAddress);
        if (ctx.input.shippingAddress)
          body.shipping_address = mapAddress(ctx.input.shippingAddress);
        let data = await client.createCustomer(storeId, body);
        let customer = data.customer || data;
        return {
          output: {
            rawResponse: client.responses,
            customerId: requiredId(customer.id),
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name
          },
          message: `Created customer **${customer.email || customer.id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.customerId) throw createApiServiceError('customerId is required');
        let body: Record<string, any> = {};
        if (ctx.input.email) body.email_address = ctx.input.email;
        if (ctx.input.firstName) body.first_name = ctx.input.firstName;
        if (ctx.input.lastName) body.last_name = ctx.input.lastName;
        if (ctx.input.billingAddress)
          body.billing_address = mapAddress(ctx.input.billingAddress);
        if (ctx.input.shippingAddress)
          body.shipping_address = mapAddress(ctx.input.shippingAddress);
        let data = await client.updateCustomer(storeId, ctx.input.customerId, body);
        let customer = data.customer || data;
        return {
          output: {
            rawResponse: client.responses,
            customerId: requiredId(customer.id),
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name
          },
          message: `Updated customer **${ctx.input.customerId}**.`
        };
      }

      case 'get': {
        if (!ctx.input.customerId) throw createApiServiceError('customerId is required');
        let data = await client.getCustomer(storeId, ctx.input.customerId);
        let customer = data.customer || data;
        return {
          output: {
            rawResponse: client.responses,
            customerId: requiredId(customer.id),
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name
          },
          message: `Retrieved customer **${customer.email || customer.id}**.`
        };
      }
    }
  })
  .build();
