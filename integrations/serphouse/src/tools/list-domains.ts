import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `Retrieve all supported search engine domains. Returns Google, Bing, and Yahoo regional domain variants that can be used as the "domain" parameter in SERP search tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      domains: z.array(z.string()).describe('List of supported search engine domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.listDomains();

    let domains = response?.results ?? [];

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        domains: Array.isArray(domains) ? domains : []
      },
      message: `Retrieved **${Array.isArray(domains) ? domains.length : 0}** supported search engine domains.`
    };
  })
  .build();
