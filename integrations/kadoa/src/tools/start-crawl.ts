import { SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let startCrawl = SlateTool.create(spec, {
  name: 'Start Crawl',
  key: 'start_crawl',
  description: `Start a new web crawling session. Crawls accessible subpages of a website and converts them into structured markdown or JSON.
Provide a single URL or multiple URLs from the same domain. Returns a session ID for tracking progress.`,
  constraints: [
    'All URLs must be from the same domain or subdomain.',
    'maxDepth range: 1-200, maxPages range: 1-100000.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('Single URL to crawl'),
      startUrls: z
        .array(z.string())
        .optional()
        .describe('Multiple URLs to crawl (same domain)'),
      maxDepth: z
        .number()
        .optional()
        .describe('Maximum crawl depth (default varies, max 200)'),
      maxPages: z.number().optional().describe('Maximum number of pages to crawl (max 100000)')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Crawl session ID for tracking progress')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });

    if (!ctx.input.url && (!ctx.input.startUrls || ctx.input.startUrls.length === 0)) {
      throw new Error('Either url or startUrls must be provided');
    }

    let result = await client.startCrawl({
      url: ctx.input.url,
      startUrls: ctx.input.startUrls,
      maxDepth: ctx.input.maxDepth,
      maxPages: ctx.input.maxPages
    });

    let sessionId = result.sessionId || result.id || result;

    return {
      output: {
        sessionId: String(sessionId)
      },
      message: `Crawl session **${sessionId}** started for ${ctx.input.url || ctx.input.startUrls?.join(', ')}.`
    };
  })
  .build();
