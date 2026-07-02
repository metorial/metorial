import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let shortInterestRecordSchema = z.object({
  recordDate: z.string().optional().describe('Record date'),
  symbol: z.string().optional().describe('Ticker symbol'),
  company: z.string().optional().describe('Company name'),
  exchange: z.string().optional().describe('Exchange'),
  sector: z.string().optional().describe('Sector'),
  industry: z.string().optional().describe('Industry'),
  totalShortInterest: z.number().optional().describe('Total short interest (shares)'),
  daysToCover: z.number().optional().describe('Days to cover'),
  shortPercentOfFloat: z.number().optional().describe('Short interest as percentage of float'),
  shortPriorMonth: z.number().optional().describe('Short interest from prior month'),
  percentChangeMoM: z.number().optional().describe('Month-over-month percent change'),
  sharesFloat: z.number().optional().describe('Shares in float'),
  averageDailyVolume: z.number().optional().describe('Average daily volume'),
  sharesOutstanding: z.number().optional().describe('Total shares outstanding')
});

export let getShortInterestTool = SlateTool.create(spec, {
  name: 'Get Short Interest',
  key: 'get_short_interest',
  description: `Retrieve short interest data for securities including total short interest, days to cover, short percent of float, and month-over-month changes. Useful for gauging bearish sentiment on a stock.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "TSLA,AAPL")'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      records: z.array(shortInterestRecordSchema).describe('Short interest data records'),
      count: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getShortInterest({
      symbols: ctx.input.symbols,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    // Response is nested: { shortInterestData: { SYMBOL: { data: [...] } } }
    let records: any[] = [];
    let shortInterestData = data?.shortInterestData || data;
    if (shortInterestData && typeof shortInterestData === 'object') {
      for (let sym of Object.keys(shortInterestData)) {
        let symbolData = shortInterestData[sym];
        let dataArray = symbolData?.data || (Array.isArray(symbolData) ? symbolData : []);
        for (let item of dataArray) {
          records.push({
            recordDate: item.recordDate,
            symbol: item.symbol || sym,
            company: item.company,
            exchange: item.exchange,
            sector: item.sector,
            industry: item.industry,
            totalShortInterest: item.totalShortInterest
              ? Number(item.totalShortInterest)
              : undefined,
            daysToCover: item.daysToCover ? Number(item.daysToCover) : undefined,
            shortPercentOfFloat: item.shortPercentOfFloat
              ? Number(item.shortPercentOfFloat)
              : undefined,
            shortPriorMonth: item.shortPriorMo ? Number(item.shortPriorMo) : undefined,
            percentChangeMoM: item.percentChangeMoMo
              ? Number(item.percentChangeMoMo)
              : undefined,
            sharesFloat: item.sharesFloat ? Number(item.sharesFloat) : undefined,
            averageDailyVolume: item.averageDailyVolume
              ? Number(item.averageDailyVolume)
              : undefined,
            sharesOutstanding: item.sharesOutstanding
              ? Number(item.sharesOutstanding)
              : undefined
          });
        }
      }
    }

    return {
      output: {
        records,
        count: records.length
      },
      message: `Found **${records.length}** short interest record(s) for: ${ctx.input.symbols}.`
    };
  })
  .build();
