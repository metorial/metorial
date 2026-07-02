import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

let analyticsMetricSchema = z.object({
  label: z.string(),
  value: z.number(),
  percentage: z.number()
});

let storeSummaryItemSchema = z.object({
  totalRevenue: z.number(),
  totalCount: z.number(),
  fees: z.number(),
  taxes: z.number(),
  currency: z.string()
});

export let getSiteAnalytics = SlateTool.create(spec, {
  name: 'Get Site Analytics',
  key: 'get_site_analytics',
  description: `Retrieve comprehensive analytics for a site including views, clicks, traffic sources, device/browser breakdowns, geographic data, and optionally store/e-commerce metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to get analytics for'),
      period: z
        .enum(['7d', '30d', '90d', '1y', 'all'])
        .optional()
        .describe('Time period for analytics (default: 30d)'),
      includeStore: z.boolean().optional().describe('Include store/e-commerce metrics')
    })
  )
  .output(
    z.object({
      totalViews: z.number(),
      totalClicks: z.number(),
      activities: z.array(
        z.object({
          date: z.string(),
          views: z.number(),
          clicks: z.number()
        })
      ),
      referrers: z.array(analyticsMetricSchema),
      devices: z.array(analyticsMetricSchema),
      browsers: z.array(analyticsMetricSchema),
      cities: z.array(analyticsMetricSchema),
      countries: z.array(analyticsMetricSchema),
      blocks: z.array(
        z.object({
          blockId: z.string(),
          blockType: z.string(),
          interactions: z.number()
        })
      ),
      store: z
        .object({
          summary: z.object({
            orders: storeSummaryItemSchema,
            bookings: storeSummaryItemSchema,
            invoices: storeSummaryItemSchema,
            tips: storeSummaryItemSchema,
            totalSales: storeSummaryItemSchema
          }),
          stats: z.object({
            totalOrders: z.number(),
            totalProducts: z.number(),
            totalCoupons: z.number(),
            totalQuotes: z.number(),
            totalInvoices: z.number()
          }),
          bestSellers: z.array(
            z.object({
              productId: z.string(),
              productName: z.string(),
              revenue: z.number(),
              unitsSold: z.number()
            })
          ),
          hasActiveConnection: z.boolean(),
          hasSalesHistory: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let analytics = await client.getSiteAnalytics(ctx.input.siteId, {
      period: ctx.input.period,
      includeStore: ctx.input.includeStore
    });

    return {
      output: analytics,
      message: `Analytics for period **${ctx.input.period ?? '30d'}**: **${analytics.totalViews}** views, **${analytics.totalClicks}** clicks.`
    };
  })
  .build();
