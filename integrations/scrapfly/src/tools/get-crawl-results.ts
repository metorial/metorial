import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCrawlResults = SlateTool.create(spec, {
  name: 'Get Crawl Results',
  key: 'get_crawl_results',
  description: `Retrieve the discovered URLs and their extracted content from a completed or running crawl. Returns the list of crawled URLs with metadata and optionally the page contents in the specified format.`,
  instructions: [
    'First retrieve URLs to see what was crawled, then optionally retrieve content for specific pages.',
    'Use **includeContent** to also retrieve page contents alongside URLs.',
    'The **contentFormat** parameter controls the format of retrieved content (e.g., "markdown" for LLM processing).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      crawlUuid: z.string().describe('UUID of the crawl job.'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Whether to also retrieve page contents (may be large).'),
      contentFormat: z
        .string()
        .optional()
        .describe('Format for content retrieval (e.g., html, markdown, text).')
    })
  )
  .output(
    z.object({
      urls: z.any().describe('List of crawled URLs with metadata.'),
      contents: z.any().optional().describe('Page contents if includeContent was set to true.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let urls = await client.getCrawlUrls(ctx.input.crawlUuid);

    let contents: any;
    if (ctx.input.includeContent) {
      contents = await client.getCrawlContents(ctx.input.crawlUuid, ctx.input.contentFormat);
    }

    return {
      output: {
        urls,
        contents
      },
      message: `Retrieved crawl results for \`${ctx.input.crawlUuid}\`. ${ctx.input.includeContent ? 'URLs and content retrieved.' : 'URLs retrieved.'}`
    };
  })
  .build();
