import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let propertyTypeEnum = z.enum([
  'apartment',
  'house',
  'building',
  'parking',
  'office',
  'land',
  'shop'
]);
let transactionTypeEnum = z.enum(['sale', 'rent']);

let propertyTypeMap: Record<string, number> = {
  apartment: 0,
  house: 1,
  building: 2,
  parking: 3,
  office: 4,
  land: 5,
  shop: 6
};

let transactionTypeMap: Record<string, number> = {
  sale: 0,
  rent: 1
};

export let getPricePerMeterEvolution = SlateTool.create(spec, {
  name: 'Price Per Meter Evolution',
  key: 'price_per_meter_evolution',
  description: `Track price-per-meter trends over time for a given area. Returns average, median, min, and max price per meter along with a time series.
Use location filters to focus on a specific city, department, or geographic area.`,
  instructions: [
    'Provide location filters (department, city, zipcode, or lat/lon with radius) for meaningful results.',
    'Use aggregationInterval to control the granularity: "month" or "year".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionType: transactionTypeEnum.optional().describe('Filter by transaction type'),
      propertyTypes: z.array(propertyTypeEnum).optional().describe('Filter by property types'),
      includedDepartments: z
        .array(z.string())
        .optional()
        .describe('Department IRIs to include'),
      includedCities: z.array(z.string()).optional().describe('City IRIs to include'),
      includedZipcodes: z.array(z.string()).optional().describe('Zipcodes to include'),
      latitude: z.number().optional().describe('Center latitude for radius filter'),
      longitude: z.number().optional().describe('Center longitude for radius filter'),
      radius: z.number().optional().describe('Search radius in km'),
      budgetMin: z.number().optional().describe('Minimum price filter'),
      budgetMax: z.number().optional().describe('Maximum price filter'),
      surfaceMin: z.number().optional().describe('Minimum surface area filter'),
      surfaceMax: z.number().optional().describe('Maximum surface area filter'),
      aggregationInterval: z
        .enum(['month', 'year'])
        .optional()
        .describe('Time series granularity')
    })
  )
  .output(
    z.object({
      average: z.number().nullable().describe('Average price per m²'),
      averageMin: z.number().nullable().describe('Minimum average price per m²'),
      averageMax: z.number().nullable().describe('Maximum average price per m²'),
      median: z.number().nullable().describe('Median price per m²'),
      series: z
        .record(z.string(), z.number())
        .describe('Time series of price per m² values keyed by date period')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.transactionType)
      params.transactionType = transactionTypeMap[ctx.input.transactionType];
    if (ctx.input.propertyTypes) {
      params['propertyTypes[]'] = ctx.input.propertyTypes.map(t => propertyTypeMap[t]);
    }
    if (ctx.input.includedDepartments)
      params['includedDepartments[]'] = ctx.input.includedDepartments;
    if (ctx.input.includedCities) params['includedCities[]'] = ctx.input.includedCities;
    if (ctx.input.includedZipcodes) params['includedZipcodes[]'] = ctx.input.includedZipcodes;
    if (ctx.input.latitude !== undefined) params.lat = ctx.input.latitude;
    if (ctx.input.longitude !== undefined) params.lon = ctx.input.longitude;
    if (ctx.input.radius !== undefined) params.radius = ctx.input.radius;
    if (ctx.input.budgetMin !== undefined) params.budgetMin = ctx.input.budgetMin;
    if (ctx.input.budgetMax !== undefined) params.budgetMax = ctx.input.budgetMax;
    if (ctx.input.surfaceMin !== undefined) params.surfaceMin = ctx.input.surfaceMin;
    if (ctx.input.surfaceMax !== undefined) params.surfaceMax = ctx.input.surfaceMax;
    if (ctx.input.aggregationInterval)
      params.aggregationInterval = ctx.input.aggregationInterval;

    let result = await client.getPricePerMeterEvolution(params);
    let item = result['hydra:member']?.[0];

    let output = {
      average: item?.average ?? null,
      averageMin: item?.average_min ?? null,
      averageMax: item?.average_max ?? null,
      median: item?.median ?? null,
      series: item?.series ?? {}
    };

    let seriesCount = Object.keys(output.series).length;
    return {
      output,
      message: output.average
        ? `Price per m² — Average: **${output.average.toFixed(2)}€**, Median: **${output.median?.toFixed(2) ?? 'N/A'}€**, Range: ${output.averageMin?.toFixed(2) ?? '?'}€ – ${output.averageMax?.toFixed(2) ?? '?'}€. ${seriesCount} data points in time series.`
        : `No price per meter data available for the specified criteria.`
    };
  })
  .build();
