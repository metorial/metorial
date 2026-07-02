import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getSalesReport = SlateTool.create(spec, {
  name: 'Get Sales Report',
  key: 'get_sales_report',
  description: `Retrieve sales reports and top sellers data. Get total sales, order counts, average order value, and top-selling products for a given period.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z.enum(['sales', 'top_sellers']).describe('Type of report to retrieve'),
      period: z
        .enum(['week', 'month', 'last_month', 'year'])
        .optional()
        .describe('Predefined time period'),
      dateMin: z.string().optional().describe('Start date (YYYY-MM-DD) — overrides period'),
      dateMax: z.string().optional().describe('End date (YYYY-MM-DD) — overrides period')
    })
  )
  .output(
    z.object({
      salesReport: z
        .object({
          totalSales: z.string(),
          netSales: z.string(),
          averageSales: z.string(),
          totalOrders: z.number(),
          totalItems: z.number(),
          totalTax: z.string(),
          totalShipping: z.string(),
          totalRefunds: z.number(),
          totalDiscount: z.string(),
          totalCustomers: z.number()
        })
        .optional()
        .describe('Sales summary (for sales report type)'),
      topSellers: z
        .array(
          z.object({
            productId: z.number(),
            name: z.string(),
            quantity: z.number()
          })
        )
        .optional()
        .describe('Top selling products (for top_sellers report type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.period) params.period = ctx.input.period;
    if (ctx.input.dateMin) params.date_min = ctx.input.dateMin;
    if (ctx.input.dateMax) params.date_max = ctx.input.dateMax;

    if (ctx.input.reportType === 'sales') {
      let report = await client.getSalesReport(params);
      let r = Array.isArray(report) ? report[0] : report;

      return {
        output: {
          salesReport: {
            totalSales: r?.total_sales || '0',
            netSales: r?.net_sales || '0',
            averageSales: r?.average_sales || '0',
            totalOrders: r?.total_orders || 0,
            totalItems: r?.total_items || 0,
            totalTax: r?.total_tax || '0',
            totalShipping: r?.total_shipping || '0',
            totalRefunds: r?.total_refunds || 0,
            totalDiscount: r?.total_discount || '0',
            totalCustomers: r?.total_customers || 0
          }
        },
        message: `Sales report: **${r?.total_orders || 0}** orders, total sales **${r?.total_sales || '0'}**.`
      };
    }

    let topSellers = await client.getTopSellersReport(params);

    let mapped = (Array.isArray(topSellers) ? topSellers : []).map((p: any) => ({
      productId: p.product_id,
      name: p.title || '',
      quantity: p.quantity || 0
    }));

    return {
      output: { topSellers: mapped },
      message: `Retrieved **${mapped.length}** top-selling products.`
    };
  })
  .build();
