import { createApiServiceError, isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient, optionalString, requireId } from '../lib/client';
import { spec } from '../spec';

export let listCurrencies = SlateTool.create(spec, {
  name: 'List Currencies',
  key: 'list_currencies',
  description: `Retrieve all currencies supported by Finmei. Returns currency codes, names, and symbols. Useful for validating currency codes before creating invoices or expenses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      currencies: z
        .array(
          z.object({
            code: z.string().describe('Three-letter currency code (e.g., "USD")'),
            name: z.string().optional().describe('Currency name (e.g., "US Dollar")'),
            symbol: z.string().optional().describe('Currency symbol (e.g., "$")')
          })
        )
        .describe('List of supported currencies'),
      rawResponse: z.any().optional().describe('Complete provider response'),
      count: z.number().describe('Total number of supported currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listCurrencies();

    let values = Array.isArray(result)
      ? result
      : isApiErrorRecord(result)
        ? (result.data ?? result.currencies)
        : undefined;
    if (!Array.isArray(values))
      throw createApiServiceError(
        'Finmei returned an invalid currencies list; expected an array.'
      );
    let currencies = values.map(value => {
      if (typeof value === 'string') return { code: requireId(value, 'currency code') };
      if (!isApiErrorRecord(value))
        throw createApiServiceError('Finmei returned an invalid currency item.');
      return {
        code: requireId(value.code ?? value.iso ?? value.id, 'currency code'),
        ...pickDefined({
          name: optionalString(value.name, 'currency name'),
          symbol: optionalString(value.symbol, 'currency symbol')
        })
      };
    });

    return {
      output: {
        currencies,
        rawResponse: result,
        count: currencies.length
      },
      message: `Found **${currencies.length}** supported currencies.`
    };
  })
  .build();
