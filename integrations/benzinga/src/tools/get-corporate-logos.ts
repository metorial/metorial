import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let logoResultSchema = z.object({
  searchKey: z.string().optional().describe('Identifying search term'),
  createdAt: z.string().optional().describe('Record creation timestamp'),
  updatedAt: z.string().optional().describe('Record last update timestamp'),
  logoLight: z.string().optional().describe('Light-themed logo URL'),
  logoDark: z.string().optional().describe('Dark-themed logo URL'),
  logoVectorLight: z.string().optional().describe('Light-themed SVG logo URL'),
  logoVectorDark: z.string().optional().describe('Dark-themed SVG logo URL'),
  markLight: z.string().optional().describe('Light-themed icon/mark URL'),
  markDark: z.string().optional().describe('Dark-themed icon/mark URL'),
  backgroundColorLight: z
    .string()
    .optional()
    .describe('Brand background color (light theme, HEX)'),
  backgroundColorDark: z
    .string()
    .optional()
    .describe('Brand background color (dark theme, HEX)'),
  securities: z
    .array(
      z.object({
        symbol: z.string().optional(),
        exchange: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Associated securities')
});

export let getCorporateLogosTool = SlateTool.create(spec, {
  name: 'Get Corporate Logos',
  key: 'get_corporate_logos',
  description: `Search for corporate logos by ticker symbol, CIK, CUSIP, or ISIN. Returns logo images in light/dark variants, vector formats, and associated brand colors for publicly traded companies.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchKeys: z
        .string()
        .describe(
          'Comma-separated identifiers (max 100). Supports "SYMBOL" or "EXCHANGE:SYMBOL" format, e.g. "AAPL,NYSE:ARI"'
        ),
      searchKeysType: z
        .enum(['symbol', 'cik', 'cusip', 'isin'])
        .optional()
        .default('symbol')
        .describe('Type of identifier used in searchKeys')
    })
  )
  .output(
    z.object({
      logos: z.array(logoResultSchema).describe('Logo results for requested companies'),
      count: z.number().describe('Number of logo results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.searchLogos({
      searchKeys: ctx.input.searchKeys,
      searchKeysType: ctx.input.searchKeysType
    });

    let results = data?.data || (Array.isArray(data) ? data : []);
    let logos = results.map((item: any) => ({
      searchKey: item.search_key,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      logoLight: item.files?.logo_light,
      logoDark: item.files?.logo_dark,
      logoVectorLight: item.files?.logo_vector_light,
      logoVectorDark: item.files?.logo_vector_dark,
      markLight: item.files?.mark_light,
      markDark: item.files?.mark_dark,
      backgroundColorLight: item.colors?.background_light,
      backgroundColorDark: item.colors?.background_dark,
      securities: (item.securities || []).map((s: any) => ({
        symbol: s.symbol,
        exchange: s.exchange,
        name: s.name
      }))
    }));

    return {
      output: {
        logos,
        count: logos.length
      },
      message: `Found **${logos.length}** logo result(s) for: ${ctx.input.searchKeys}.`
    };
  })
  .build();
