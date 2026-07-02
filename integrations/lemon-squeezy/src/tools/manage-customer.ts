import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { lemonSqueezyServiceError } from '../lib/errors';
import { spec } from '../spec';

let customerOutputSchema = z.object({
  customerId: z.string(),
  storeId: z.number(),
  name: z.string(),
  email: z.string(),
  status: z.string(),
  statusFormatted: z.string(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  countryFormatted: z.string().nullable().optional(),
  totalRevenueCurrency: z.number(),
  totalRevenueCurrencyFormatted: z.string().optional(),
  mrr: z.number(),
  mrrFormatted: z.string().optional(),
  customerPortalUrl: z.string().nullable().optional(),
  testMode: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

let formatCustomer = (customer: any) => ({
  customerId: customer.id,
  storeId: customer.attributes.store_id,
  name: customer.attributes.name,
  email: customer.attributes.email,
  status: customer.attributes.status,
  statusFormatted: customer.attributes.status_formatted,
  city: customer.attributes.city,
  region: customer.attributes.region,
  country: customer.attributes.country,
  countryFormatted: customer.attributes.country_formatted,
  totalRevenueCurrency: customer.attributes.total_revenue_currency,
  totalRevenueCurrencyFormatted: customer.attributes.total_revenue_currency_formatted,
  mrr: customer.attributes.mrr,
  mrrFormatted: customer.attributes.mrr_formatted,
  customerPortalUrl: customer.attributes.urls?.customer_portal ?? null,
  testMode: customer.attributes.test_mode,
  createdAt: customer.attributes.created_at,
  updatedAt: customer.attributes.updated_at
});

export let manageCustomerTool = SlateTool.create(spec, {
  name: 'Manage Customer',
  key: 'manage_customer',
  description:
    'Retrieve, create, update, or archive a Lemon Squeezy customer. Use action to choose the operation. Create requires storeId or configured storeId plus name and email; update requires customerId plus fields to change; archive marks the customer status as archived.',
  instructions: [
    'Use action "get" with customerId to retrieve a customer.',
    'Use action "create" with name, email, and storeId or configured storeId.',
    'Use action "update" with customerId and at least one customer field.',
    'Use action "archive" with customerId to set status to archived.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'archive']).describe('The customer action'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID for get, update, or archive actions'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID for create. Falls back to the configured store ID if omitted.'),
      name: z.string().optional().describe('Customer name for create or update'),
      email: z.string().optional().describe('Customer email for create or update'),
      city: z.string().optional().describe('Customer city for create or update'),
      region: z.string().optional().describe('Customer region for create or update'),
      country: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code for create or update')
    })
  )
  .output(
    z.object({
      customer: customerOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let customer: any;

    if (ctx.input.action === 'get') {
      if (!ctx.input.customerId) {
        throw lemonSqueezyServiceError('customerId is required for get action.');
      }
      let response = await client.getCustomer(ctx.input.customerId);
      customer = response.data;
    } else if (ctx.input.action === 'create') {
      let storeId = ctx.input.storeId || ctx.config.storeId;
      if (!storeId) {
        throw lemonSqueezyServiceError(
          'Store ID is required. Provide it in the input or configure it in the provider settings.'
        );
      }
      if (!ctx.input.name) {
        throw lemonSqueezyServiceError('name is required for create action.');
      }
      if (!ctx.input.email) {
        throw lemonSqueezyServiceError('email is required for create action.');
      }

      let response = await client.createCustomer(storeId, {
        name: ctx.input.name,
        email: ctx.input.email,
        city: ctx.input.city,
        region: ctx.input.region,
        country: ctx.input.country
      });
      customer = response.data;
    } else {
      if (!ctx.input.customerId) {
        throw lemonSqueezyServiceError(`${ctx.input.action} action requires customerId.`);
      }

      let attributes: Record<string, unknown> = {};
      if (ctx.input.action === 'archive') {
        attributes.status = 'archived';
      } else {
        if (ctx.input.name !== undefined) attributes.name = ctx.input.name;
        if (ctx.input.email !== undefined) attributes.email = ctx.input.email;
        if (ctx.input.city !== undefined) attributes.city = ctx.input.city;
        if (ctx.input.region !== undefined) attributes.region = ctx.input.region;
        if (ctx.input.country !== undefined) attributes.country = ctx.input.country;

        if (Object.keys(attributes).length === 0) {
          throw lemonSqueezyServiceError(
            'Provide at least one customer field for update action.'
          );
        }
      }

      let response = await client.updateCustomer(ctx.input.customerId, attributes);
      customer = response.data;
    }

    let formatted = formatCustomer(customer);
    let actionLabel =
      ctx.input.action === 'get'
        ? 'Retrieved'
        : ctx.input.action === 'create'
          ? 'Created'
          : ctx.input.action === 'archive'
            ? 'Archived'
            : 'Updated';

    return {
      output: {
        customer: formatted
      },
      message: `${actionLabel} customer **${formatted.email}**.`
    };
  })
  .build();
