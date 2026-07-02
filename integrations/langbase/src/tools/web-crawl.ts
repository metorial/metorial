import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let crawlResultSchema = z.object({
  url: z.string().describe('URL of the crawled page'),
  content: z.string().describe('Extracted page content')
});

export let webCrawl = SlateTool.create(spec, {
  name: 'Web Crawl',
  key: 'web_crawl',
  description: `Crawl web pages to extract their content using Spider Cloud or Firecrawl through Langbase. Provide URLs to crawl and receive extracted page content. Requires a crawl service API key.`,
  constraints: ['Maximum of 100 URLs per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z.array(z.string()).describe('URLs to crawl (max 100)'),
      crawlApiKey: z
        .string()
        .describe('API key for the crawling service (Spider Cloud or Firecrawl)'),
      maxPages: z
        .number()
        .optional()
        .describe('Maximum number of pages to crawl (defaults to 50)'),
      service: z
        .enum(['spider', 'firecrawl'])
        .optional()
        .describe('Crawling service to use (defaults to spider)')
    })
  )
  .output(
    z.object({
      results: z
        .array(crawlResultSchema)
        .describe('Crawled page results with URLs and content'),
      resultCount: z.number().describe('Number of pages crawled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      url: ctx.input.urls
    };

    if (ctx.input.maxPages !== undefined) body.maxPages = ctx.input.maxPages;
    if (ctx.input.service !== undefined) body.service = ctx.input.service;

    let result = await client.webCrawl(body, ctx.input.crawlApiKey);
    let results = (Array.isArray(result) ? result : []).map((r: any) => ({
      url: r.url ?? '',
      content: r.content ?? ''
    }));

    return {
      output: {
        results,
        resultCount: results.length
      },
      message: `Crawled **${results.length}** page(s).`
    };
  })
  .build();
