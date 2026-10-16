import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient, eodhdArray } from '../lib/client';
import { spec } from '../spec';

let exchangeDetailsSchema = z.object({
  Name: z.string().describe('Exchange name'),
  Code: z.string().describe('Exchange code'),
  Timezone: z.string().describe('IANA exchange time zone'),
  TradingHours: z
    .object({
      Open: z.string().optional(),
      Close: z.string().optional(),
      WorkingDays: z.string().optional(),
      PreMarketOpen: z.string().optional(),
      PreMarketClose: z.string().optional(),
      AfterHoursOpen: z.string().optional(),
      AfterHoursClose: z.string().optional(),
      LunchBreakStart: z.string().optional(),
      LunchBreakEnd: z.string().optional()
    })
    .describe('Regular and optional extended or split sessions in local exchange time'),
  ExchangeHolidays: z
    .record(
      z.string(),
      z.object({
        Holiday: z.string(),
        Type: z.string(),
        EarlyClose: z.string().optional()
      })
    )
    .describe('Holidays keyed by YYYY-MM-DD; early closing entries include a closing time')
});

export let getExchangeDetails = SlateTool.create(spec, {
  name: 'Get Exchange Details',
  key: 'get_exchange_details',
  description:
    'List supported exchange codes or retrieve verified trading hours, extended sessions, lunch breaks, and holidays for an exchange.',
  instructions: [
    'Omit exchangeCode to discover supported codes, then pass one of those codes to retrieve its details.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      exchangeCode: z
        .string()
        .optional()
        .describe(
          'Exchange code from this tool’s code list, for example US, LSE, or XHKG; omit to list codes'
        )
    })
  )
  .output(
    z.object({
      exchangeCodes: z
        .array(z.string())
        .optional()
        .describe('Supported codes when no exchangeCode is provided'),
      exchange: exchangeDetailsSchema
        .optional()
        .describe('Exchange details when exchangeCode is provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });
    let data = await client.getExchangeDetails(ctx.input.exchangeCode);
    if (!ctx.input.exchangeCode) {
      let exchangeCodes = eodhdArray(data, 'supported exchange codes');
      return {
        output: { exchangeCodes },
        message: `Retrieved **${exchangeCodes.length}** exchange codes.`
      };
    }
    let exchange = exchangeDetailsSchema.safeParse(data);
    if (!exchange.success) {
      throw createApiServiceError('EODHD returned invalid exchange details.', {
        reason: 'invalid_response'
      });
    }
    return {
      output: { exchange: exchange.data },
      message: `Retrieved details for **${ctx.input.exchangeCode}**.`
    };
  })
  .build();
