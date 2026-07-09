import { SlateTool } from 'slates';
import { z } from 'zod';
import { NorgesBankClient } from '../lib/client';
import {
  frequencySchema,
  genericInstrumentTypeSchema,
  genericTenorSchema,
  localeSchema,
  uniqueValues,
  validateGenericRateCombinations,
  validatePeriodRange
} from '../lib/options';
import { spec } from '../spec';

let sdmxJsonSchema = z
  .object({
    meta: z.any().describe('Raw SDMX meta object returned by Norges Bank'),
    data: z.any().describe('Raw SDMX data object returned by Norges Bank')
  })
  .passthrough();

export let getGenericRates = SlateTool.create(spec, {
  name: 'Get Generic Rates',
  key: 'get_generic_rates',
  description:
    'Get raw Norges Bank generic-rate SDMX JSON for treasury bills and government bonds.',
  instructions: [
    'Use frequency B with YYYY-MM-DD periods, M with YYYY-MM periods, and A with YYYY periods.',
    'Treasury bills support 3M, 6M, and 12M tenors. Government bonds support 3Y, 5Y, 7Y, and 10Y tenors.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      frequency: frequencySchema.describe('Frequency: B business day, M monthly, or A annual'),
      tenors: z.array(genericTenorSchema).min(1).describe('Generic-rate tenors to retrieve'),
      instrumentTypes: z
        .array(genericInstrumentTypeSchema)
        .min(1)
        .describe(
          'Norges Bank instrument codes to retrieve: TBIL for treasury bills or GBON for government bonds. Use these exact codes.'
        ),
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
    let tenors = uniqueValues(ctx.input.tenors);
    let instrumentTypes = uniqueValues(ctx.input.instrumentTypes);
    validatePeriodRange(ctx.input.frequency, ctx.input.startPeriod, ctx.input.endPeriod);
    validateGenericRateCombinations(tenors, instrumentTypes);

    let client = new NorgesBankClient();
    let response = await client.getGenericRates({
      frequency: ctx.input.frequency,
      tenors,
      instrumentTypes,
      startPeriod: ctx.input.startPeriod,
      endPeriod: ctx.input.endPeriod,
      locale: ctx.input.locale
    });

    return {
      output: response,
      message: 'Retrieved raw Norges Bank generic-rate SDMX JSON.'
    };
  })
  .build();
