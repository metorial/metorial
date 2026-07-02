import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let convertTool = SlateTool.create(spec, {
  name: 'Convert Currency & Units',
  key: 'convert',
  description: `Convert between currencies (50+ including crypto) and measurement units (temperature, distance, weight, time, energy, etc.). Currency rates are updated every 15 minutes. Supports historical rate lookups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromValue: z.string().describe('The value to convert (e.g., "10.95")'),
      fromType: z
        .string()
        .describe('Source currency or unit code (e.g., "USD", "km", "celsius")'),
      toType: z
        .string()
        .describe('Target currency or unit code (e.g., "EUR", "miles", "fahrenheit")'),
      historicalDate: z
        .string()
        .optional()
        .describe('Date for historical conversion rates (YYYY-MM-DD, YYYY-MM, or YYYY)')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the conversion was successful'),
      result: z.string().describe('Conversion result as string'),
      resultFloat: z.number().describe('Conversion result as number'),
      fromValue: z.string().describe('Original value'),
      fromType: z.string().describe('Source type code'),
      fromName: z.string().describe('Full name of source type'),
      fromSymbol: z.string().describe('Symbol for source type'),
      toType: z.string().describe('Target type code'),
      toName: z.string().describe('Full name of target type'),
      toSymbol: z.string().describe('Symbol for target type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.convert({
      fromValue: ctx.input.fromValue,
      fromType: ctx.input.fromType,
      toType: ctx.input.toType,
      historicalDate: ctx.input.historicalDate
    });

    return {
      output: {
        valid: result.valid ?? false,
        result: result.result ?? '',
        resultFloat: result.resultFloat ?? 0,
        fromValue: result.fromValue ?? ctx.input.fromValue,
        fromType: result.fromType ?? ctx.input.fromType,
        fromName: result.fromName ?? '',
        fromSymbol: result.fromSymbol ?? '',
        toType: result.toType ?? ctx.input.toType,
        toName: result.toName ?? '',
        toSymbol: result.toSymbol ?? ''
      },
      message: result.valid
        ? `${result.fromValue} ${result.fromName} = **${result.result} ${result.toName}**`
        : `Conversion failed. Check that the from/to types are valid.`
    };
  })
  .build();
