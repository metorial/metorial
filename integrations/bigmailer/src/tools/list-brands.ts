import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBrands = SlateTool.create(spec, {
  name: 'List Brands',
  key: 'list_brands',
  description: `List brands (subaccounts) in your BigMailer account. Returns brand details including name, default sender info, bounce settings, and contact limits. Use pagination parameters to iterate through large brand lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of brands to return (1-100). Defaults to 10.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more brands exist beyond this page'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      total: z.number().describe('Total number of brands in the account'),
      brands: z.array(
        z.object({
          brandId: z.string().describe('Brand unique identifier'),
          name: z.string().describe('Brand name'),
          fromName: z.string().describe('Default sender name'),
          fromEmail: z.string().describe('Default sender email'),
          filterSoftBounces: z
            .boolean()
            .describe('Whether soft-bounced contacts are filtered'),
          maxSoftBounces: z.number().describe('Max soft bounces before marking undeliverable'),
          bounceDangerPercent: z
            .number()
            .describe('Bounce percentage that triggers auto-pause'),
          unsubscribeText: z.string().describe('Message shown on unsubscribe page'),
          connectionId: z.string().describe('Email connection service ID'),
          contactLimit: z.number().describe('Maximum contacts allowed'),
          url: z.string().describe('Associated website URL'),
          createdAt: z.string().describe('Creation timestamp (ISO 8601)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listBrands({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let brands = result.data.map(b => ({
      brandId: b.id,
      name: b.name,
      fromName: b.from_name,
      fromEmail: b.from_email,
      filterSoftBounces: b.filter_soft_bounces,
      maxSoftBounces: b.max_soft_bounces,
      bounceDangerPercent: b.bounce_danger_percent,
      unsubscribeText: b.unsubscribe_text,
      connectionId: b.connection_id,
      contactLimit: b.contact_limit,
      url: b.url,
      createdAt: new Date(b.created * 1000).toISOString()
    }));

    return {
      output: {
        hasMore: result.has_more,
        cursor: result.cursor,
        total: result.total,
        brands
      },
      message: `Found **${result.total}** brand(s). Returned **${brands.length}** brand(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
