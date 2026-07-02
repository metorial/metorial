import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let findSimilarDomains = SlateTool.create(spec, {
  name: 'Find Similar Domains',
  key: 'find_similar_domains',
  description: `Returns a list of competitor and similar domains based on the category and target market of a given URL. Useful for market research, competitive analysis, and discovering related websites.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to find competitors and similar domains for')
    })
  )
  .output(
    z.object({
      similarDomains: z
        .array(z.string())
        .describe('List of competitor and similar domain names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.similarDomains(ctx.input.url);

    let domains = result.similar_domains ?? result.similar ?? [];

    let output = {
      similarDomains: Array.isArray(domains) ? domains : []
    };

    return {
      output,
      message:
        output.similarDomains.length > 0
          ? `Found **${output.similarDomains.length}** similar domains for **${ctx.input.url}**: ${output.similarDomains.slice(0, 5).join(', ')}${output.similarDomains.length > 5 ? '...' : ''}.`
          : `No similar domains found for **${ctx.input.url}**.`
    };
  })
  .build();
