import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let exchangeRates = SlateTool.create(spec, {
  name: 'Exchange Rates',
  key: 'exchange_rates',
  description: `Gets live or historical exchange rates and performs currency conversion. Supports three modes:
- **Live rates**: Get current exchange rates for a base currency
- **Historical rates**: Get exchange rates for a specific past date
- **Conversion**: Convert an amount between two currencies (optionally on a specific date)`,
  instructions: [
    'Use 3-letter ISO currency codes (e.g. USD, EUR, GBP).',
    'For historical rates, provide the date in YYYY-MM-DD format.',
    'Set the mode to "live", "historical", or "convert" depending on your use case.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['live', 'historical', 'convert'])
        .describe(
          'Operation mode: "live" for current rates, "historical" for past rates, "convert" for currency conversion'
        ),
      baseCurrency: z.string().describe('Base currency code (e.g. "USD")'),
      targetCurrency: z
        .string()
        .optional()
        .describe(
          'Target currency code to filter results (e.g. "EUR"). Required for "convert" mode.'
        ),
      date: z
        .string()
        .optional()
        .describe(
          'Date for historical rates in YYYY-MM-DD format. Required for "historical" mode.'
        ),
      amount: z
        .number()
        .optional()
        .describe('Amount to convert. Used in "convert" mode. Defaults to 1.')
    })
  )
  .output(
    z.object({
      baseCurrency: z.string().describe('The base currency code'),
      targetCurrency: z.string().optional().describe('The target currency code'),
      date: z.string().optional().describe('The date for the rates'),
      exchangeRates: z
        .record(z.string(), z.number())
        .optional()
        .describe('Map of currency codes to exchange rates'),
      convertedAmount: z
        .number()
        .optional()
        .describe('The converted amount (for convert mode)'),
      baseAmount: z.number().optional().describe('The base amount used for conversion'),
      lastUpdated: z.string().optional().describe('Timestamp when rates were last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);
    let { mode, baseCurrency, targetCurrency, date, amount } = ctx.input;

    if (mode === 'convert' && !targetCurrency) {
      throw new Error('targetCurrency is required for "convert" mode.');
    }
    if (mode === 'historical' && !date) {
      throw new Error('date is required for "historical" mode.');
    }

    let output: {
      baseCurrency: string;
      targetCurrency?: string;
      date?: string;
      exchangeRates?: Record<string, number>;
      convertedAmount?: number;
      baseAmount?: number;
      lastUpdated?: string;
    };

    if (mode === 'convert') {
      let result = await client.convertCurrency({
        base: baseCurrency,
        target: targetCurrency!,
        baseAmount: amount,
        date
      });

      output = {
        baseCurrency: result.base ?? baseCurrency,
        targetCurrency: targetCurrency,
        date: result.date ?? date,
        convertedAmount:
          result.converted_amount != null ? Number(result.converted_amount) : undefined,
        baseAmount: result.base_amount != null ? Number(result.base_amount) : (amount ?? 1),
        exchangeRates: result.exchange_rates ?? undefined,
        lastUpdated: result.last_updated != null ? String(result.last_updated) : undefined
      };
    } else if (mode === 'historical') {
      let result = await client.getHistoricalExchangeRates({
        base: baseCurrency,
        date: date!,
        target: targetCurrency
      });

      output = {
        baseCurrency: result.base ?? baseCurrency,
        targetCurrency,
        date: result.date ?? date,
        exchangeRates: result.exchange_rates ?? undefined,
        lastUpdated: result.last_updated != null ? String(result.last_updated) : undefined
      };
    } else {
      let result = await client.getLiveExchangeRates({
        base: baseCurrency,
        target: targetCurrency
      });

      output = {
        baseCurrency: result.base ?? baseCurrency,
        targetCurrency,
        exchangeRates: result.exchange_rates ?? undefined,
        lastUpdated: result.last_updated != null ? String(result.last_updated) : undefined
      };
    }

    let message: string;
    if (mode === 'convert' && output.convertedAmount != null) {
      message = `**${output.baseAmount ?? 1} ${baseCurrency}** = **${output.convertedAmount} ${targetCurrency}**${date ? ` (as of ${date})` : ''}.`;
    } else {
      let rateCount = output.exchangeRates ? Object.keys(output.exchangeRates).length : 0;
      message = `Retrieved **${rateCount}** ${mode} exchange rate(s) for **${baseCurrency}**${date ? ` on ${date}` : ''}.`;
    }

    return { output, message };
  })
  .build();
