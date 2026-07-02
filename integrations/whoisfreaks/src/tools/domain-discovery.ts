import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let domainDiscovery = SlateTool.create(spec, {
  name: 'Domain Discovery',
  key: 'domain_discovery',
  description: `Find all registered domains containing an exact keyword. Searches across 800M+ domains, 1500+ TLDs, and 9000+ SLDs. Useful for brand monitoring, competitive analysis, and finding related domains.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword to search for in registered domain names'),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      discoveredDomains: z.any().describe('List of registered domains matching the keyword')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.domainDiscovery(ctx.input.keyword, ctx.input.page);

    return {
      output: { discoveredDomains: result },
      message: `Discovered registered domains matching keyword **${ctx.input.keyword}**.`
    };
  })
  .build();
