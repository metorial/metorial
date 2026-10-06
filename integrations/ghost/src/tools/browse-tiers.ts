import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { pagination } from '../lib/schemas';
import { spec } from '../spec';

let tierSchema = z
  .object({
    tierId: z.string().describe('Unique tier ID'),
    name: z.string().optional().describe('Tier name'),
    slug: z.string().optional().describe('URL-friendly slug'),
    description: z.string().nullable().optional().describe('Tier description'),
    type: z.string().optional().describe('Tier type: free or paid'),
    active: z.boolean().optional().describe('Whether the tier is active'),
    visibility: z.string().optional().describe('Tier visibility: public or none'),
    currency: z.string().nullable().optional().describe('Pricing currency'),
    monthlyPrice: z.number().nullable().optional().describe('Monthly price in cents'),
    yearlyPrice: z.number().nullable().optional().describe('Yearly price in cents'),
    welcomePageUrl: z.string().nullable().optional().describe('Welcome page URL after signup'),
    benefits: z.array(z.string()).nullable().optional().describe('List of tier benefits'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().nullable().optional().describe('Last update timestamp')
  })
  .partial()
  .required({ tierId: true });

let paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  pages: z.number(),
  total: z.number(),
  next: z.number().nullable(),
  prev: z.number().nullable()
});

export let browseTiers = SlateTool.create(spec, {
  name: 'Browse Tiers',
  key: 'browse_tiers',
  description: `List membership tiers configured on your Ghost site. Tiers define pricing levels and content access for paid subscriptions. Includes pricing details when requested.`,
  instructions: [
    'Use **include** with `monthly_price,yearly_price,benefits` to get pricing and benefits.',
    'Use **filter** to find specific tiers: `type:paid`, `active:true`, `visibility:public`.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      api: z
        .enum(['admin', 'content'])
        .optional()
        .describe(
          'Read through Admin or published Content API. Writes require Admin. Defaults to the connection type.'
        ),
      filter: z
        .string()
        .optional()
        .describe('Ghost NQL filter expression (e.g., "type:paid", "active:true")'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated includes (e.g., "monthly_price,yearly_price,benefits")'),
      limit: z.number().optional().describe('Number of tiers per page'),
      page: z.number().optional().describe('Page number'),
      order: z.string().optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      tiers: z.array(tierSchema).describe('List of tiers'),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx, ctx.input.api);

    let result = await client.browseTiers({
      filter: ctx.input.filter,
      include: ctx.input.include ?? 'monthly_price,yearly_price,benefits',
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order
    });

    let tiers = (result.tiers ?? []).map((t: any) => ({
      tierId: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      type: t.type,
      active: t.active,
      visibility: t.visibility,
      currency: t.currency,
      monthlyPrice: t.monthly_price,
      yearlyPrice: t.yearly_price,
      welcomePageUrl: t.welcome_page_url,
      benefits: t.benefits,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    let pageInfo = pagination(result, tiers.length);

    return {
      output: { tiers, pagination: pageInfo },
      message: `Found **${pageInfo.total}** tiers.`
    };
  })
  .build();
