import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dailySalesDataSchema = z.object({
  date: z.string().describe('Date of the data point (yyyy-mm-dd)'),
  estimatedUnitsSold: z.number().nullable().describe('Estimated units sold on this day'),
  lastKnownPrice: z.number().nullable().describe('Last known product price on this day')
});

export let salesEstimatesTool = SlateTool.create(spec, {
  name: 'Sales Estimates',
  key: 'sales_estimates',
  description: `Retrieve daily historical sales estimates and pricing data for a specific Amazon ASIN over a date range. Returns estimated units sold and price values per day, enabling **sales trend analysis**, competitor monitoring, seasonal pattern identification, and inventory planning.`,
  instructions: [
    'Provide a single ASIN and a date range to retrieve daily sales estimates.',
    'Dates must be in yyyy-mm-dd format and the end date must be before the current date.',
    'For variant ASINs, the API returns aggregated parent ASIN values.'
  ],
  constraints: [
    'Maximum date range is one year per request.',
    'End date must precede the current date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      asin: z.string().describe('The Amazon ASIN to get sales estimates for'),
      startDate: z.string().describe('Start date of the period (yyyy-mm-dd)'),
      endDate: z.string().describe('End date of the period (yyyy-mm-dd)')
    })
  )
  .output(
    z.object({
      asin: z.string().describe('The queried ASIN'),
      isParent: z.boolean().nullable().describe('Whether this ASIN is a parent product'),
      variants: z
        .array(z.string())
        .nullable()
        .describe('List of variant ASINs if this is a parent product'),
      dailySales: z.array(dailySalesDataSchema).describe('Daily sales estimate data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      marketplace: ctx.config.marketplace,
      apiType: ctx.config.apiType
    });

    let result = await client.salesEstimates({
      asin: ctx.input.asin,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let dailySales: Array<{
      date: string;
      estimatedUnitsSold: number | null;
      lastKnownPrice: number | null;
    }> = [];
    let isParent: boolean | null = null;
    let variants: string[] | null = null;

    let items = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    for (let item of items) {
      isParent = item.attributes?.is_parent ?? null;
      variants = item.attributes?.variants ?? null;

      let estimates = item.attributes?.data || [];
      for (let entry of estimates) {
        dailySales.push({
          date: entry.date || '',
          estimatedUnitsSold: entry.estimated_units_sold ?? null,
          lastKnownPrice: entry.last_known_price ?? null
        });
      }
    }

    let totalSales = dailySales.reduce((sum, d) => sum + (d.estimatedUnitsSold || 0), 0);

    return {
      output: {
        asin: ctx.input.asin,
        isParent,
        variants,
        dailySales
      },
      message: `Retrieved **${dailySales.length}** daily data points for ASIN ${ctx.input.asin} from ${ctx.input.startDate} to ${ctx.input.endDate}. Estimated total units sold: **${totalSales}**.`
    };
  })
  .build();
