import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List domains associated with your Basin account. Domains are used for custom sender email addresses and form configurations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      query: z.string().optional().describe('Search by domain ID or name.')
    })
  )
  .output(
    z.object({
      domains: z.array(
        z.object({
          domainId: z.number().describe('Domain ID.'),
          name: z.string().describe('Domain name.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listDomains({
      page: ctx.input.page,
      query: ctx.input.query
    });

    let items = Array.isArray(data) ? data : (data?.items ?? data?.domains ?? []);

    let domains = items.map((d: any) => ({
      domainId: d.id,
      name: d.name ?? ''
    }));

    return {
      output: { domains },
      message: `Found **${domains.length}** domain(s).`
    };
  })
  .build();
