import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { paymentPageUrl } from '../lib/mapping';
import {
  exactId,
  observedFlag,
  optionalNumericId,
  pagination,
  record,
  records,
  validateOutput
} from '../lib/transport';
import { spec } from '../spec';

const createPaymentPageOutput = z.object({
  pageId: z.number().optional().describe('Page ID'),
  exactPageId: z
    .string()
    .describe(
      'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
    ),
  slug: z.string().describe('Page URL slug'),
  pageUrl: z.string().describe('Full URL for the payment page'),
  name: z.string().describe('Page name'),
  amount: z.number().nullable().describe('Fixed amount if set')
});

export let createPaymentPage = SlateTool.create(spec, {
  name: 'Create Payment Page',
  key: 'create_payment_page',
  description: `Create a hosted payment page that can be shared via link. Useful for collecting payments without building a custom checkout.
Amount is in the **smallest currency unit**. Leave amount empty to let the customer enter an amount.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Page name/title'),
      description: z.string().optional().describe('Page description shown to customers'),
      amount: z
        .number()
        .optional()
        .describe(
          'Fixed amount in smallest currency unit. Leave empty for customer-entered amount'
        ),
      slug: z
        .string()
        .optional()
        .describe('URL slug for the page. Auto-generated from name if not provided'),
      redirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect customers to after payment'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(createPaymentPageOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.createPaymentPage(ctx.input);
    const page = record(result.data);
    const output = {
      pageId: optionalNumericId(page.id),
      exactPageId: exactId(page.id),
      slug: page.slug,
      pageUrl: paymentPageUrl(page.slug),
      name: page.name,
      amount: page.amount ?? null
    };
    return {
      output: validateOutput(createPaymentPageOutput, output),
      message:
        'Hosted payment page created; it can expose a collection page. Deactivation retains its history.'
    };
  })
  .build();
const listPaymentPagesOutput = z.object({
  pages: z.array(
    z.object({
      pageId: z.number().optional().describe('Page ID'),
      exactPageId: z
        .string()
        .describe(
          'Exact provider resource ID; legacy numeric ID is omitted outside its safe range'
        ),
      name: z.string().describe('Page name'),
      slug: z.string().describe('URL slug'),
      pageUrl: z.string().describe('Full payment page URL'),
      amount: z.number().nullable().describe('Fixed amount if set'),
      active: z.boolean().describe('Whether the page is active')
    })
  ),
  totalCount: z.number().optional().describe('Total pages'),
  currentPage: z.number().optional().describe('Current page number'),
  totalPages: z.number().optional().describe('Total page count'),
  nextCursor: z.string().nullable().optional().describe('Provider next cursor, when returned'),
  previousCursor: z
    .string()
    .nullable()
    .optional()
    .describe('Provider previous cursor, when returned'),
  perPage: z.number().optional().describe('Observed provider page size')
});

export let listPaymentPages = SlateTool.create(spec, {
  name: 'List Payment Pages',
  key: 'list_payment_pages',
  description: `Retrieve a paginated list of payment pages on your integration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Records per page'),
      page: z.number().optional().describe('Page number'),
      from: z.string().optional().describe('Start date (ISO 8601)'),
      to: z.string().optional().describe('End date (ISO 8601)')
    })
  )
  .output(listPaymentPagesOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    const result = await client.listPaymentPages(ctx.input);
    const output = {
      pages: records(result.data).map(item => ({
        pageId: optionalNumericId(item.id),
        exactPageId: exactId(item.id),
        name: item.name,
        slug: item.slug,
        pageUrl: paymentPageUrl(item.slug),
        amount: item.amount ?? null,
        active: observedFlag(item.active)
      })),
      ...pagination(result.meta)
    };
    return {
      output: validateOutput(listPaymentPagesOutput, output),
      message:
        'Retrieved the requested page; continuation and counts are included only when returned by Paystack.'
    };
  })
  .build();
const updatePaymentPageOutput = z.object({
  success: z.boolean().describe('Whether the update succeeded')
});

export let updatePaymentPage = SlateTool.create(spec, {
  name: 'Update Payment Page',
  key: 'update_payment_page',
  description: `Update an existing payment page's name, description, amount, or active status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pageIdOrSlug: z.string().describe('Page ID or URL slug'),
      name: z.string().optional().describe('Updated page name'),
      description: z.string().optional().describe('Updated description'),
      amount: z.number().optional().describe('Updated fixed amount in smallest currency unit'),
      active: z.boolean().optional().describe('Whether the page is active')
    })
  )
  .output(updatePaymentPageOutput)
  .handleInvocation(async ctx => {
    const client = new PaystackClient({ token: ctx.auth.token });
    await client.updatePaymentPage(ctx.input.pageIdOrSlug, ctx.input);
    const output = { success: true };
    return {
      output: validateOutput(updatePaymentPageOutput, output),
      message: 'Payment page update confirmed.'
    };
  })
  .build();
