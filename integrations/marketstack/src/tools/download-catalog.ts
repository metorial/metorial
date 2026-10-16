import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let catalogs = {
  supported_tickers: {
    url: 'https://marketstack.com/download/supported_tickers_2.csv',
    filename: 'supported_tickers_2.csv',
    mimeType: 'text/csv'
  },
  eod_tickers: {
    url: 'https://marketstack.com/download/v2_eod_tickers_finnworlds_tiingo.xlsx',
    filename: 'v2_eod_tickers_finnworlds_tiingo.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  commodities: {
    url: 'https://marketstack.com/download/marketstack-commodities.xlsx',
    filename: 'marketstack-commodities.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
};

export let downloadCatalog = SlateTool.create(spec, {
  key: 'download_catalog',
  name: 'Download Market Data Catalog',
  description:
    'Download the provider-published supported ticker, end-of-day ticker, or commodity catalog to discover query identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      catalog: z
        .enum(['supported_tickers', 'eod_tickers', 'commodities'])
        .describe('The provider catalog to download.')
    })
  )
  .output(z.object({ filename: z.string(), mimeType: z.string(), url: z.string() }))
  .handleInvocation(async ctx => {
    let file = catalogs[ctx.input.catalog];
    await ctx.addAttachment({ type: 'url', ...file });
    return { output: file, message: `Prepared ${file.filename} for download.` };
  })
  .build();
