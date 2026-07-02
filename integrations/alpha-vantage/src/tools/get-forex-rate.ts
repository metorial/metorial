import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getForexRate = SlateTool.create(spec, {
  name: 'Get Forex Rate',
  key: 'get_forex_rate',
  description: `Retrieve foreign exchange rate data for a currency pair. Supports real-time exchange rates as well as historical time series at intraday, daily, weekly, and monthly resolutions. Use standard ISO 4217 currency codes (e.g. USD, EUR, GBP, JPY).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromCurrency: z.string().describe('Source currency code, e.g. "USD"'),
      toCurrency: z.string().describe('Target currency code, e.g. "EUR"'),
      resolution: z
        .enum(['realtime', 'intraday', 'daily', 'weekly', 'monthly'])
        .optional()
        .default('realtime')
        .describe('Time resolution. "realtime" returns the latest exchange rate only.'),
      interval: z
        .enum(['1min', '5min', '15min', '30min', '60min'])
        .optional()
        .describe('Interval for intraday data. Required when resolution is "intraday".'),
      outputSize: z
        .enum(['compact', 'full'])
        .optional()
        .default('compact')
        .describe('"compact" returns the latest 100 data points; "full" returns full history')
    })
  )
  .output(
    z.object({
      fromCurrency: z.string().describe('Source currency code'),
      toCurrency: z.string().describe('Target currency code'),
      exchangeRate: z.string().optional().describe('Current exchange rate (realtime only)'),
      lastRefreshed: z.string().optional().describe('Timestamp of the latest data point'),
      rates: z
        .array(
          z.object({
            date: z.string().describe('Date or datetime'),
            open: z.string().describe('Opening rate'),
            high: z.string().describe('Highest rate'),
            low: z.string().describe('Lowest rate'),
            close: z.string().describe('Closing rate')
          })
        )
        .optional()
        .describe('Historical rate data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { fromCurrency, toCurrency, resolution, interval, outputSize } = ctx.input;

    if (resolution === 'realtime') {
      let data = await client.currencyExchangeRate({ fromCurrency, toCurrency });
      let rateInfo = data['Realtime Currency Exchange Rate'] || {};

      return {
        output: {
          fromCurrency,
          toCurrency,
          exchangeRate: rateInfo['5. Exchange Rate'] || '',
          lastRefreshed: rateInfo['6. Last Refreshed'] || ''
        },
        message: `**${fromCurrency}/${toCurrency}** exchange rate: ${rateInfo['5. Exchange Rate'] || 'N/A'}.`
      };
    }

    let data: any;
    if (resolution === 'intraday') {
      if (!interval) throw new Error('Interval is required for intraday resolution.');
      data = await client.fxIntraday({
        fromSymbol: fromCurrency,
        toSymbol: toCurrency,
        interval,
        outputSize
      });
    } else if (resolution === 'daily') {
      data = await client.fxDaily({
        fromSymbol: fromCurrency,
        toSymbol: toCurrency,
        outputSize
      });
    } else if (resolution === 'weekly') {
      data = await client.fxWeekly({ fromSymbol: fromCurrency, toSymbol: toCurrency });
    } else {
      data = await client.fxMonthly({ fromSymbol: fromCurrency, toSymbol: toCurrency });
    }

    let metaData = data['Meta Data'] || {};
    let lastRefreshed = metaData['5. Last Refreshed'] || metaData['4. Last Refreshed'] || '';

    let timeSeriesKey = Object.keys(data).find(k => k !== 'Meta Data') || '';
    let timeSeries = data[timeSeriesKey] || {};

    let rates = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: values['1. open'] || '',
      high: values['2. high'] || '',
      low: values['3. low'] || '',
      close: values['4. close'] || ''
    }));

    return {
      output: {
        fromCurrency,
        toCurrency,
        lastRefreshed,
        rates
      },
      message: `Retrieved ${rates.length} ${resolution} FX data points for **${fromCurrency}/${toCurrency}**.`
    };
  })
  .build();
