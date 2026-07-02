import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractNewsLinksTool = SlateTool.create(spec, {
  name: 'Extract News Links',
  key: 'extract_news_links',
  description: `Extract news article links from a given news website URL. Useful for discovering all articles published on a particular news source. Optionally filter links by a URL prefix or include sub-domain links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('News website URL to extract links from (e.g. "https://www.nytimes.com")'),
      prefix: z.string().optional().describe('Only return links starting with this prefix'),
      includeSubDomains: z
        .boolean()
        .optional()
        .describe('Include links from sub-domains of the given URL')
    })
  )
  .output(
    z.object({
      links: z.array(z.string()).describe('List of discovered news article URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractNewsLinks({
      url: ctx.input.url,
      prefix: ctx.input.prefix,
      subDomain: ctx.input.includeSubDomains
    });

    return {
      output: {
        links: result.news_links || []
      },
      message: `Found **${(result.news_links || []).length}** news links from ${ctx.input.url}.`
    };
  })
  .build();
