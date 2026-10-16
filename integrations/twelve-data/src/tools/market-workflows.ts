import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import {
  optionalNumber,
  optionalString,
  record,
  records,
  requiredString
} from '../lib/response';
import { spec } from '../spec';

const rawSchema = z.record(z.string(), z.any());
const symbolInput = z
  .string()
  .describe('Ticker symbol. Use search_symbols to identify the instrument and exchange.');
const exchangeInput = z
  .string()
  .optional()
  .describe('Exchange name from list_exchanges or search_symbols.');
const micInput = z
  .string()
  .optional()
  .describe('Market Identifier Code from search_symbols or list_exchanges.');
const countryInput = z
  .string()
  .optional()
  .describe('Country name or alpha code used to disambiguate the instrument.');

export let getEndOfDayPrice = SlateTool.create(spec, {
  key: 'get_end_of_day_price',
  name: 'Get End-of-Day Price',
  description:
    'Retrieve the latest available end-of-day close, or the close for a specified date. Coverage and freshness depend on the exchange and subscription.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: symbolInput,
      exchange: exchangeInput,
      micCode: micInput,
      country: countryInput,
      date: z
        .string()
        .optional()
        .describe(
          'Date requested, YYYY-MM-DD. Omit for the latest available end-of-day close.'
        ),
      decimalPlaces: z
        .number()
        .int()
        .min(0)
        .max(11)
        .optional()
        .describe('Decimal places for the returned close.')
    })
  )
  .output(
    z.object({
      symbol: z.string(),
      exchange: z.string(),
      micCode: z.string().optional(),
      currency: z.string().optional(),
      datetime: z.string().describe('Provider bar date/time; no UTC conversion is applied.'),
      close: z.string(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    const result = await new TwelveDataClient(ctx.auth.token).getEodPrice({
      ...ctx.input,
      dp: ctx.input.decimalPlaces
    });
    return {
      output: {
        symbol: requiredString(result.symbol, 'symbol'),
        exchange: requiredString(result.exchange, 'exchange'),
        micCode: optionalString(result.mic_code),
        currency: optionalString(result.currency),
        datetime: requiredString(result.datetime, 'datetime'),
        close: requiredString(result.close, 'close'),
        raw: result
      },
      message: 'Retrieved the available end-of-day close with its provider date.'
    };
  })
  .build();

export let getApiUsage = SlateTool.create(spec, {
  key: 'get_api_usage',
  name: 'Get API Usage',
  description:
    'Inspect the connected API key’s current credit usage, plan limits, and plan category. This endpoint reports usage rather than account identity.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      timezone: z
        .string()
        .optional()
        .describe(
          'UTC or a case-sensitive IANA timezone for the provider timestamp. Default UTC.'
        )
    })
  )
  .output(
    z.object({
      timestamp: z.string().optional(),
      currentUsage: z.number().optional(),
      planLimit: z.number().optional(),
      dailyUsage: z.number().optional(),
      planDailyLimit: z.number().optional(),
      planCategory: z.string().optional(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    const result = record(
      await new TwelveDataClient(ctx.auth.token).getApiUsage(ctx.input.timezone),
      'API usage'
    );
    return {
      output: {
        timestamp: optionalString(result.timestamp),
        currentUsage: optionalNumber(result.current_usage),
        planLimit: optionalNumber(result.plan_limit),
        dailyUsage: optionalNumber(result.daily_usage),
        planDailyLimit: optionalNumber(result.plan_daily_limit),
        planCategory: optionalString(result.plan_category),
        raw: result
      },
      message: 'Retrieved API credit usage and available plan-limit fields.'
    };
  })
  .build();

export let getMarketState = SlateTool.create(spec, {
  key: 'get_market_state',
  name: 'Get Market State',
  description:
    'Read exchange trading-session state, optionally filtered by exchange, MIC code, or country. Use returned session fields rather than assuming a quote is current.',
  tags: { readOnly: true }
})
  .input(z.object({ exchange: exchangeInput, code: micInput, country: countryInput }))
  .output(z.object({ markets: z.array(rawSchema), totalCount: z.number() }))
  .handleInvocation(async ctx => {
    const markets = records(
      await new TwelveDataClient(ctx.auth.token).getMarketState(ctx.input),
      'market state'
    );
    return {
      output: { markets, totalCount: markets.length },
      message: `Retrieved ${markets.length} exchange session records.`
    };
  })
  .build();

export let getEarningsCalendar = SlateTool.create(spec, {
  key: 'get_earnings_calendar',
  name: 'Get Earnings Calendar',
  description:
    'Retrieve earnings events grouped by provider date, with optional date and exchange filters. Actual and estimated values may be unavailable; raw records preserve provider nulls.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      exchange: exchangeInput,
      micCode: micInput,
      country: countryInput,
      startDate: z
        .string()
        .optional()
        .describe('Start date, YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.'),
      endDate: z.string().optional().describe('End date, YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.')
    })
  )
  .output(z.object({ earnings: z.record(z.string(), z.array(rawSchema)), raw: rawSchema }))
  .handleInvocation(async ctx => {
    const result = await new TwelveDataClient(ctx.auth.token).getEarningsCalendar(ctx.input);
    const earnings = Object.fromEntries(
      Object.entries(record(result.earnings, 'earnings')).map(([date, events]) => [
        date,
        records(events, `earnings.${date}`)
      ])
    );
    return {
      output: { earnings, raw: result },
      message: `Retrieved earnings events for ${Object.keys(earnings).length} provider dates.`
    };
  })
  .build();

export let getEarningsHistory = SlateTool.create(spec, {
  key: 'get_earnings_history',
  name: 'Get Earnings History',
  description:
    'Retrieve company earnings history, or select the latest or next earnings record. EPS data can contain unavailable values. Availability depends on the instrument and subscription.',
  instructions: [
    'The period values latest and next select one record and override date/output-size filters; annual and quarterly are not earnings endpoint period values.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: symbolInput,
      exchange: exchangeInput,
      micCode: micInput,
      country: countryInput,
      period: z.enum(['latest', 'next']).optional(),
      outputsize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum records, ignored when period is set.'),
      startDate: z
        .string()
        .optional()
        .describe('Start date, YYYY-MM-DD; ignored when period is set.'),
      endDate: z
        .string()
        .optional()
        .describe('End date, YYYY-MM-DD; ignored when period is set.')
    })
  )
  .output(z.object({ symbol: z.string(), earnings: z.array(rawSchema), raw: rawSchema }))
  .handleInvocation(async ctx => {
    const result = await new TwelveDataClient(ctx.auth.token).getEarnings(ctx.input);
    return {
      output: {
        symbol: requiredString(record(result.meta, 'meta').symbol, 'meta.symbol'),
        earnings: records(result.earnings, 'earnings'),
        raw: result
      },
      message: 'Retrieved earnings records from the provider.'
    };
  })
  .build();

export let listTechnicalIndicators = SlateTool.create(spec, {
  key: 'list_technical_indicators',
  name: 'List Technical Indicators',
  description:
    'Discover the provider’s supported technical-indicator endpoint keys, descriptions, and parameter metadata before calling get_technical_indicator.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ indicators: z.record(z.string(), rawSchema), raw: rawSchema }))
  .handleInvocation(async ctx => {
    const result = await new TwelveDataClient(ctx.auth.token).getTechnicalIndicators();
    const indicators = Object.fromEntries(
      Object.entries(record(result.data, 'data')).map(([key, value]) => [
        key,
        record(value, `indicator ${key}`)
      ])
    );
    return {
      output: { indicators, raw: result },
      message: `Retrieved metadata for ${Object.keys(indicators).length} indicator endpoints.`
    };
  })
  .build();

export let getFundData = SlateTool.create(spec, {
  key: 'get_fund_data',
  name: 'Get Fund Data',
  description:
    'Retrieve the current global ETF or mutual-fund dataset, preserving summary, composition, performance, and risk sections as returned. Sections and access depend on the fund and subscription.',
  instructions: [
    'Use fundType etf for /etfs/world or mutual_fund for /mutual_funds/world. The response is a nested fund dataset rather than a legacy profile/holdings pair.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      fundType: z.enum(['etf', 'mutual_fund']),
      symbol: symbolInput,
      country: countryInput,
      decimalPlaces: z.number().int().min(0).max(11).optional()
    })
  )
  .output(z.object({ fund: rawSchema, raw: rawSchema }))
  .handleInvocation(async ctx => {
    const result = await new TwelveDataClient(ctx.auth.token).getFundData({
      ...ctx.input,
      dp: ctx.input.decimalPlaces
    });
    return {
      output: {
        fund: record(ctx.input.fundType === 'etf' ? result.etf : result.mutual_fund, 'fund'),
        raw: result
      },
      message: 'Retrieved the available global fund dataset.'
    };
  })
  .build();
