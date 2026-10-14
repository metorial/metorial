import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { validateKadoaInteger } from '../lib/validation';
import { spec } from '../spec';

export let startCrawl = SlateTool.create(spec, {
  name: 'Start Crawl',
  key: 'start_crawl',
  description: `Start a new web crawling session. Crawls accessible subpages of a website and converts them into structured markdown or JSON.
Provide a single URL or multiple URLs from the same domain. Returns a session ID for tracking progress.`,
  constraints: [
    'All URLs must be from the same domain or subdomain.',
    'maxDepth and maxPages must be positive whole numbers.'
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
      maxDepth: z.number().optional().describe('Maximum crawl depth (positive whole number)'),
      maxPages: z
        .number()
        .optional()
        .describe('Maximum number of pages to crawl (positive whole number)')
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
      throw createApiServiceError(
        'Either url or at least one startUrls entry must be provided.'
      );
    }

    validateKadoaInteger(ctx.input.maxDepth, 'maxDepth', 1);
    validateKadoaInteger(ctx.input.maxPages, 'maxPages', 1);

    let result = await client.startCrawl({
      url: ctx.input.url,
      startUrls: ctx.input.startUrls,
      maxDepth: ctx.input.maxDepth,
      maxPages: ctx.input.maxPages
    });

    let sessionId =
      result.sessionId || result.id || (typeof result === 'string' ? result : undefined);
    if (typeof sessionId !== 'string' || !sessionId) {
      throw createApiServiceError(
        'Kadoa did not return a crawl session ID. Check the crawl in your dashboard before retrying.'
      );
    }

    return {
      output: {
        sessionId: String(sessionId)
      },
      message: `Crawl session **${sessionId}** started for ${ctx.input.url || ctx.input.startUrls?.join(', ')}.`
    };
  })
  .build();
