import { SlateTool } from 'slates';
import { z } from 'zod';
import { NorgesBankClient } from '../lib/client';
import {
  exchangeBaseCurrencySchema,
  frequencySchema,
  localeSchema,
  uniqueValues,
  validatePeriodRange
} from '../lib/options';
import { spec } from '../spec';

let sdmxJsonSchema = z
  .object({
    meta: z.any().describe('Raw SDMX meta object returned by Norges Bank'),
    data: z.any().describe('Raw SDMX data object returned by Norges Bank')
  })
  .passthrough();

export let getExchangeRates = SlateTool.create(spec, {
  name: 'Get Exchange Rates',
  key: 'get_exchange_rates',
  description:
    'Get raw Norges Bank exchange-rate SDMX JSON for selected base currencies against Norwegian krone spot.',
  instructions: [
    'Use frequency B with YYYY-MM-DD periods, M with YYYY-MM periods, and A with YYYY periods.',
    'Quote currency is fixed to NOK and tenor is fixed to spot, matching the Norges Bank query form.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      frequency: frequencySchema.describe('Frequency: B business day, M monthly, or A annual'),
      baseCurrencies: z
        .array(exchangeBaseCurrencySchema)
        .min(1)
        .describe('Base currencies to retrieve. Quote currency is fixed to NOK.'),
      startPeriod: z
        .string()
        .describe('Start period. Use YYYY-MM-DD for B, YYYY-MM for M, or YYYY for A.'),
      endPeriod: z
        .string()
        .describe('End period. Use YYYY-MM-DD for B, YYYY-MM for M, or YYYY for A.'),
      locale: localeSchema.optional().default('en').describe('Response locale')
    })
  )
  .output(sdmxJsonSchema)
  .handleInvocation(async ctx => {
    let baseCurrencies = uniqueValues(ctx.input.baseCurrencies);
    validatePeriodRange(ctx.input.frequency, ctx.input.startPeriod, ctx.input.endPeriod);

    let client = new NorgesBankClient();
    let response = await client.getExchangeRates({
      frequency: ctx.input.frequency,
      baseCurrencies,
      startPeriod: ctx.input.startPeriod,
      endPeriod: ctx.input.endPeriod,
      locale: ctx.input.locale
    });

    return {
      output: response,
      message: 'Retrieved raw Norges Bank exchange-rate SDMX JSON.'
    };
  })
  .build();
