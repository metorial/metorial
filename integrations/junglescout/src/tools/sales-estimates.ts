import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  responseArray,
  responseBoolean,
  responseCollection,
  responseNullableString,
  responseNumber,
  responseRecord,
  responseString
} from '../lib/response';
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
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response including native attributes and metadata'),
      parentAsin: z
        .string()
        .nullable()
        .optional()
        .describe('Parent ASIN returned for a variant product'),
      isVariant: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the queried ASIN is a variant'),
      isStandalone: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the queried ASIN is standalone'),
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

    let items = responseCollection(result);
    let dailySales = items.flatMap(item =>
      responseArray(item.attributes.data, 'daily sales data').map(value => {
        let entry = responseRecord(value, 'daily sales point');
        return {
          date: responseString(entry.date, 'sales date'),
          estimatedUnitsSold: responseNumber(
            entry.estimated_units_sold,
            'estimated units sold'
          ),
          lastKnownPrice: responseNumber(entry.last_known_price, 'last known price')
        };
      })
    );
    let attributes = items[0]?.attributes;
    let isParent = responseBoolean(attributes?.is_parent, 'is_parent');
    let variants =
      attributes?.variants == null
        ? null
        : responseArray(attributes.variants, 'variants').map(value =>
            responseString(value, 'variant ASIN')
          );
    let parentAsin = responseNullableString(attributes?.parent_asin, 'parent ASIN');
    let isVariant = responseBoolean(attributes?.is_variant, 'is_variant');
    let isStandalone = responseBoolean(attributes?.is_standalone, 'is_standalone');

    return {
      output: {
        raw: result,
        asin: ctx.input.asin,
        parentAsin,
        isVariant,
        isStandalone,
        isParent,
        variants,
        dailySales
      },
      message: `Retrieved **${dailySales.length}** daily data points for ASIN ${ctx.input.asin} from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
