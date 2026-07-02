import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWhitelistedDomains = SlateTool.create(spec, {
  name: 'List Whitelisted Domains',
  key: 'list_whitelisted_domains',
  description: `Retrieve the list of whitelisted domains for your Spotlightr account. Whitelisted domains control where your videos can be embedded.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z.array(z.record(z.string(), z.any())).describe('List of whitelisted domains.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getWhitelistedDomains();
    let domains = Array.isArray(result) ? result : [result];

    return {
      output: {
        domains
      },
      message: `Retrieved **${domains.length}** whitelisted domain(s).`
    };
  })
  .build();

export let addWhitelistedDomain = SlateTool.create(spec, {
  name: 'Add Whitelisted Domain',
  key: 'add_whitelisted_domain',
  description: `Add a domain to your Spotlightr account's whitelist, allowing your videos to be embedded on that domain.`
})
  .input(
    z.object({
      domain: z.string().describe('The domain to whitelist (e.g., "example.com").')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Response from Spotlightr after adding the domain.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addWhitelistedDomain(ctx.input.domain);

    return {
      output: {
        result
      },
      message: `Added **${ctx.input.domain}** to the domain whitelist.`
    };
  })
  .build();
