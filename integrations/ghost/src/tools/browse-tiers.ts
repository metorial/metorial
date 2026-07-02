import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let tierSchema = z.object({
  tierId: z.string().describe('Unique tier ID'),
  name: z.string().describe('Tier name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().nullable().describe('Tier description'),
  type: z.string().describe('Tier type: free or paid'),
  active: z.boolean().describe('Whether the tier is active'),
  visibility: z.string().describe('Tier visibility: public or none'),
  currency: z.string().nullable().describe('Pricing currency'),
  monthlyPrice: z.number().nullable().describe('Monthly price in cents'),
  yearlyPrice: z.number().nullable().describe('Yearly price in cents'),
  welcomePageUrl: z.string().nullable().describe('Welcome page URL after signup'),
  benefits: z.array(z.string()).optional().describe('List of tier benefits'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

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
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

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
      description: t.description ?? null,
      type: t.type,
      active: t.active ?? false,
      visibility: t.visibility,
      currency: t.currency ?? null,
      monthlyPrice: t.monthly_price ?? null,
      yearlyPrice: t.yearly_price ?? null,
      welcomePageUrl: t.welcome_page_url ?? null,
      benefits: t.benefits,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: tiers.length,
      next: null,
      prev: null
    };

    return {
      output: { tiers, pagination },
      message: `Found **${pagination.total}** tiers.`
    };
  })
  .build();
