import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExtractDomains = SlateTool.create(spec, {
  name: 'List Extract Domains',
  key: 'list_extract_domains',
  description:
    'List domains currently prepared for structured extraction, with supported verticals and readiness. Use a supported domain with extract_url.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Prepared domains with provider-supplied domain, verticals, and warm fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let domains = await client.listExtractDomains();
    return {
      output: { domains },
      message: `Retrieved **${domains.length}** domains prepared for structured extraction.`
    };
  })
  .build();
