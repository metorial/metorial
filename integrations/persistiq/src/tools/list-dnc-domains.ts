import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDncDomains = SlateTool.create(spec, {
  name: 'List Do Not Contact Domains',
  key: 'list_dnc_domains',
  description:
    'List domains blocked from outreach in the account. Use this to inspect the suppression list before adding a domain or enrolling prospects in campaigns.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(0).optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            dncDomainId: z.string().describe('Do Not Contact domain ID'),
            domain: z.string().describe('Blocked domain name')
          })
        )
        .describe('Blocked domains'),
      hasMore: z.boolean().describe('Whether more domains are available'),
      nextPage: z
        .string()
        .optional()
        .nullable()
        .describe('Provider continuation value for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listDncDomains(ctx.input.page);
    let domains = (result.dnc_domains || []).map(domain => ({
      dncDomainId: domain.id,
      domain: domain.name
    }));
    return {
      output: {
        domains,
        hasMore: result.has_more ?? !!result.next_page,
        nextPage: result.next_page
      },
      message: `Retrieved **${domains.length}** Do Not Contact domains.`
    };
  })
  .build();
