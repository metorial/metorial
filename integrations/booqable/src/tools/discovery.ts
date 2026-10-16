import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildClientConfig,
  flattenResourceList,
  flattenSingleResource,
  getTotalCount
} from '../lib/helpers';
import { spec } from '../spec';

let pagination = {
  pageNumber: z.number().optional().describe('Page number, starting at 1'),
  pageSize: z.number().optional().describe('Results per page, from 1 to 100')
};

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Retrieve the connected Booqable company, including its ID, name, currency, and default time zone.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ company: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let response = await new Client(buildClientConfig(ctx)).getCompany();
    let company = flattenSingleResource(response);
    return {
      output: { company },
      message: `Retrieved account **${company?.name || company?.resourceId}**.`
    };
  })
  .build();

export let listProductVariations = SlateTool.create(spec, {
  name: 'List Product Variations',
  key: 'list_product_variations',
  description:
    'List bookable product variations and discover product IDs for stock, order fulfillment, and availability. Use list_products to discover product group IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...pagination,
      productGroupId: z
        .string()
        .optional()
        .describe('Filter by a product group ID from list_products'),
      filterArchived: z.boolean().optional().describe('Filter by archived status'),
      sort: z.string().optional().describe('Sort field; prefix with - for descending')
    })
  )
  .output(
    z.object({
      products: z.array(z.record(z.string(), z.any())),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(buildClientConfig(ctx)).listResource('products', {
      pagination: ctx.input,
      filters: {
        product_group_id: ctx.input.productGroupId,
        archived: ctx.input.filterArchived
      },
      sort: ctx.input.sort
    });
    let products = flattenResourceList(response);
    return {
      output: { products, totalCount: getTotalCount(response) },
      message: `Found ${products.length} product variation(s).`
    };
  })
  .build();

export let listEmailTemplates = SlateTool.create(spec, {
  name: 'List Email Templates',
  key: 'list_email_templates',
  description:
    'List email template IDs, names, supported contexts, and subjects before sending a templated email.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...pagination,
      filterName: z.string().optional().describe('Filter by exact template name')
    })
  )
  .output(
    z.object({
      emailTemplates: z.array(z.record(z.string(), z.any())),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(buildClientConfig(ctx)).listResource('email_templates', {
      pagination: ctx.input,
      filters: { name: ctx.input.filterName }
    });
    let emailTemplates = flattenResourceList(response);
    return {
      output: { emailTemplates, totalCount: getTotalCount(response) },
      message: `Found ${emailTemplates.length} email template(s).`
    };
  })
  .build();

export let getPayment = SlateTool.create(spec, {
  name: 'Get Payment',
  key: 'get_payment',
  description:
    'Retrieve a charge, authorization, or refund and check its actual lifecycle status, provider details, refundable amounts, or capture deadline.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      paymentId: z.string().describe('Payment ID from list_payments or create_payment')
    })
  )
  .output(z.object({ payment: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let response = await new Client(buildClientConfig(ctx)).getResource(
      'payments',
      ctx.input.paymentId
    );
    let payment = flattenSingleResource(response);
    return {
      output: { payment },
      message: `Retrieved payment ${ctx.input.paymentId} (status: ${payment?.status}).`
    };
  })
  .build();

export let listPaymentMethods = SlateTool.create(spec, {
  name: 'List Payment Methods',
  key: 'list_payment_methods',
  description:
    'Discover saved payment method IDs for off-session charges and authorizations. Use list_customers to discover customer IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...pagination,
      customerId: z.string().optional().describe('Filter by a customer ID from list_customers')
    })
  )
  .output(
    z.object({
      paymentMethods: z.array(z.record(z.string(), z.any())),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(buildClientConfig(ctx)).listResource('payment_methods', {
      pagination: ctx.input,
      filters: { customer_id: ctx.input.customerId }
    });
    let paymentMethods = flattenResourceList(response);
    return {
      output: { paymentMethods, totalCount: getTotalCount(response) },
      message: `Found ${paymentMethods.length} payment method(s).`
    };
  })
  .build();
