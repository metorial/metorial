import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomain = SlateTool.create(spec, {
  name: 'Get Domain',
  key: 'get_domain',
  description:
    'Read a custom email domain, its current verification status, DNS records, and diagnostic reason without starting verification.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      domainId: z.string().describe('Domain ID. Call list_domains to discover domain IDs.')
    })
  )
  .output(
    z.object({
      domainId: z.string(),
      status: z.string(),
      domain: z
        .record(z.string(), z.unknown())
        .describe('Complete domain details from AgentMail.')
    })
  )
  .handleInvocation(async ctx => {
    let domain = await new Client({
      token: ctx.auth.token,
      podId: ctx.config.podId
    }).getDomain(ctx.input.domainId);
    return {
      output: { domainId: domain.domain_id, status: domain.status, domain: { ...domain } },
      message: `Retrieved domain ${domain.domain} (${domain.status}).`
    };
  })
  .build();
