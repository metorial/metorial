import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGrades = SlateTool.create(spec, {
  name: 'Get AI Grades',
  key: 'get_grades',
  description: `Retrieve Token Metrics' AI-powered grades for cryptocurrency assets. Supports multiple grade types:
- **Trader Grades**: Short-term oriented grades combining technical analysis, quantitative metrics, and on-chain data. Updated hourly.
- **Investor Grades**: Long-term assessments based on technology, fundamentals, and valuation. Updated daily.
- **Technology Grades**: Code activity, security, repository, and collaboration scores.
- **Fundamental Grades**: Community, exchange, VC, tokenomics, and DeFi scores.`,
  constraints: ['Date ranges for trader and investor grades are limited to 29-day windows.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      gradeType: z
        .enum(['trader', 'investor', 'technology', 'fundamental'])
        .describe('Type of grade to retrieve'),
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (for trader/investor grades)'),
      endDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format (for trader/investor grades)'),
      category: z.string().optional().describe('Comma-separated categories to filter by'),
      exchange: z.string().optional().describe('Comma-separated exchanges to filter by'),
      minMarketCap: z.number().optional().describe('Minimum market cap in USD'),
      minVolume: z.number().optional().describe('Minimum 24h trading volume in USD'),
      minFdv: z.number().optional().describe('Minimum fully diluted valuation in USD'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      grades: z.array(z.record(z.string(), z.any())).describe('Array of grade records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    let gradeParams = {
      tokenId: ctx.input.tokenId,
      symbol: ctx.input.symbol,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      category: ctx.input.category,
      exchange: ctx.input.exchange,
      marketcap: ctx.input.minMarketCap,
      volume: ctx.input.minVolume,
      fdv: ctx.input.minFdv,
      limit: ctx.input.limit,
      page: ctx.input.page
    };

    if (ctx.input.gradeType === 'trader') {
      result = await client.getTraderGrades(gradeParams);
    } else if (ctx.input.gradeType === 'investor') {
      result = await client.getInvestorGrades(gradeParams);
    } else if (ctx.input.gradeType === 'technology') {
      result = await client.getTechnologyGrade({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol
      });
    } else {
      result = await client.getFundamentalGrade({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol
      });
    }

    let grades = result?.data ?? [];

    return {
      output: { grades },
      message: `Retrieved **${grades.length}** ${ctx.input.gradeType} grade record(s).`
    };
  })
  .build();
