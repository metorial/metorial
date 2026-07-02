import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let liveDomainDetection = SlateTool.create(spec, {
  name: 'Live Domain Detection',
  key: 'live_domain_detection',
  description: `Perform a live, real-time technology scan on a website. Unlike the standard lookup which returns cached data, this endpoint triggers BuiltWith to actively crawl the domain — indexing internal pages, subdomains, tag managers, ads.txt, and technology versions within seconds.

Use this when you need the most up-to-date technology profile for a domain.`,
  instructions: [
    'This performs a live crawl which may take a few seconds longer than the cached lookup.',
    'Provide the domain without protocol (e.g., "example.com").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to perform live detection on (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Live technology detection results'),
      errors: z.array(z.string()).optional().describe('Any errors returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.domainLive(ctx.input.domain);

    let results = data?.Results ?? [];
    let errors = data?.Errors ?? [];

    return {
      output: {
        results,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Completed live technology scan for **${ctx.input.domain}**.`
    };
  });
