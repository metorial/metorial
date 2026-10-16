import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { domainLookupResponse } from '../lib/responses';
import { spec } from '../spec';

export const getDomainDetailsTool = SlateTool.create(spec, {
  key: 'get_domain_details',
  name: 'Get Domain Details',
  description:
    'Get domain registration, DNS providers, detailed mail and website status, popularity, and threat detections. Status values preserve unknown and pending results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      host: z
        .string()
        .describe('Domain, hostname, URL, HTML link, or email address to analyze'),
      live: z
        .boolean()
        .optional()
        .describe('Perform live checks for unseen domains; the provider defaults to true')
    })
  )
  .output(
    domainLookupResponse.extend({
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient(ctx.auth);
    let result = await client.structured(
      '/domain-lookup',
      { host: ctx.input.host, live: ctx.input.live },
      domainLookupResponse
    );
    return {
      output: result,
      message: `Domain lookup completed for **${result.fqdn}**. Mail status: ${result.mailStatus}; website status: ${result.websiteStatus}.${result.isPending ? ' Domain processing is pending.' : ''}`
    };
  })
  .build();
