import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupDomain = SlateTool.create(spec, {
  name: 'Lookup Domain',
  key: 'lookup_domain',
  description: `Look up one or more domains (FQDNs) to retrieve their associated categories and threat classifications. Useful for checking if a domain is categorized as malicious, what content category it belongs to, or verifying filtering behavior.
Supports single domain lookup or bulk lookup of multiple domains at once.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domains: z
        .array(z.string())
        .min(1)
        .describe('One or more fully qualified domain names (FQDNs) to look up')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Domain categorization results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { domains } = ctx.input;

    let results: any;
    if (domains.length === 1) {
      results = await client.lookupDomain(domains[0]!);
    } else {
      results = await client.bulkLookupDomains(domains);
    }

    return {
      output: { results },
      message: `Looked up **${domains.length}** domain(s).`
    };
  })
  .build();
