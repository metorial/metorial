import { SlateTool } from 'slates';
import { z } from 'zod';
import { PaystackClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      pageId: z.number().describe('Page ID'),
      slug: z.string().describe('Page URL slug'),
      pageUrl: z.string().describe('Full URL for the payment page'),
      name: z.string().describe('Page name'),
      amount: z.number().nullable().describe('Fixed amount if set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.createPaymentPage({
      name: ctx.input.name,
      description: ctx.input.description,
      amount: ctx.input.amount,
      slug: ctx.input.slug,
      redirectUrl: ctx.input.redirectUrl,
      metadata: ctx.input.metadata
    });

    let page = result.data;
    let pageUrl = `https://paystack.com/pay/${page.slug}`;

    return {
      output: {
        pageId: page.id,
        slug: page.slug,
        pageUrl,
        name: page.name,
        amount: page.amount ?? null
      },
      message: `Payment page **${page.name}** created. URL: ${pageUrl}`
    };
  })
  .build();

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
  .output(
    z.object({
      pages: z.array(
        z.object({
          pageId: z.number().describe('Page ID'),
          name: z.string().describe('Page name'),
          slug: z.string().describe('URL slug'),
          pageUrl: z.string().describe('Full payment page URL'),
          amount: z.number().nullable().describe('Fixed amount if set'),
          active: z.boolean().describe('Whether the page is active')
        })
      ),
      totalCount: z.number().describe('Total pages'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total page count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    let result = await client.listPaymentPages({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let pages = (result.data ?? []).map((p: any) => ({
      pageId: p.id,
      name: p.name,
      slug: p.slug,
      pageUrl: `https://paystack.com/pay/${p.slug}`,
      amount: p.amount ?? null,
      active: p.active ?? true
    }));

    let meta = result.meta ?? {};

    return {
      output: {
        pages,
        totalCount: meta.total ?? 0,
        currentPage: meta.page ?? 1,
        totalPages: meta.pageCount ?? 1
      },
      message: `Found **${meta.total ?? pages.length}** payment pages.`
    };
  })
  .build();

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
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PaystackClient({ token: ctx.auth.token });

    await client.updatePaymentPage(ctx.input.pageIdOrSlug, {
      name: ctx.input.name,
      description: ctx.input.description,
      amount: ctx.input.amount,
      active: ctx.input.active
    });

    return {
      output: {
        success: true
      },
      message: `Payment page **${ctx.input.pageIdOrSlug}** updated.`
    };
  })
  .build();
