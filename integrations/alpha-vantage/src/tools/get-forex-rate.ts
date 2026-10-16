import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRecord, responseSeries, responseText } from '../lib/response';
import { spec } from '../spec';

export let getForexRate = SlateTool.create(spec, {
  name: 'Get Forex Rate',
  key: 'get_forex_rate',
  description: `Retrieve foreign exchange rate data for a currency pair. Supports real-time exchange rates as well as historical time series at intraday, daily, weekly, and monthly resolutions. Use standard ISO 4217 currency codes (e.g. USD, EUR, GBP, JPY).`,
  constraints: ['Intraday FX data requires a premium API key.'],
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
      let rateInfo = responseRecord(data['Realtime Currency Exchange Rate'], 'exchange rate');

      return {
        output: {
          fromCurrency,
          toCurrency,
          exchangeRate: responseText(rateInfo['5. Exchange Rate'], ' Exchange Rate'),
          lastRefreshed: responseText(rateInfo['6. Last Refreshed'], ' Last Refreshed')
        },
        message: `**${fromCurrency}/${toCurrency}** exchange rate: ${responseText(rateInfo['5. Exchange Rate'], 'exchange rate')}.`
      };
    }

    let data: any;
    if (resolution === 'intraday') {
      if (!interval)
        throw createApiServiceError('Interval is required for intraday resolution.');
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

    let metaData = responseRecord(data['Meta Data'], 'metadata');
    let lastRefreshed = responseText(
      metaData['5. Last Refreshed'] ?? metaData['4. Last Refreshed'],
      ' Last Refreshed'
    );

    let timeSeries = responseSeries(data);

    let rates = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: responseText(values['1. open'], ' open'),
      high: responseText(values['2. high'], ' high'),
      low: responseText(values['3. low'], ' low'),
      close: responseText(values['4. close'], ' close')
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
