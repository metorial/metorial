import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRequestStatus = SlateTool.create(spec, {
  name: 'Get Request Status',
  key: 'get_request_status',
  description: `Retrieves the status and results of a previous scraping request by its request ID. Supports all service types: smartscraper, searchscraper, markdownify, scrape, crawl, sitemap, and agentic-scrapper.`,
  instructions: [
    'Use the requestId returned from any scraping tool to check its status or retrieve results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      service: z
        .enum([
          'smartscraper',
          'searchscraper',
          'markdownify',
          'scrape',
          'crawl',
          'sitemap',
          'agentic-scrapper'
        ])
        .describe('The service type the request was made to'),
      requestId: z
        .string()
        .describe('The unique request ID returned from the original request')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Unique identifier of the request'),
      status: z
        .string()
        .describe('Current status of the request (queued, processing, completed, failed)'),
      result: z.unknown().optional().describe('Result data if the request has completed'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getRequestStatus(ctx.input.service, ctx.input.requestId);

    return {
      output: {
        requestId: response.request_id || response.scrape_request_id,
        status: response.status,
        result: response.result || response.llm_result || response.html || response.urls,
        error: response.error
      },
      message: `Request **${ctx.input.requestId}** (${ctx.input.service}): Status **${response.status}**.`
    };
  })
  .build();
