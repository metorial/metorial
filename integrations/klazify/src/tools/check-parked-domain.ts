import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let checkParkedDomain = SlateTool.create(spec, {
  name: 'Check Parked Domain',
  key: 'check_parked_domain',
  description: `Checks whether a domain is parked and/or for sale. Parked domains are inactive domains that may show advertisements or redirect users to third-party websites. Useful for threat prevention, domain portfolio auditing, and identifying inactive domains.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to check for parked status')
    })
  )
  .output(
    z.object({
      parked: z.boolean().nullable().describe('Whether the domain is parked'),
      domainUrl: z.string().nullable().optional().describe('The resolved domain URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.parkedDomain(ctx.input.url);

    let domain = result.domain ?? {};

    let output = {
      parked: domain.parked ?? null,
      domainUrl: domain.domain_url ?? null
    };

    return {
      output,
      message:
        output.parked === true
          ? `**${ctx.input.url}** is a **parked domain**.`
          : output.parked === false
            ? `**${ctx.input.url}** is **not a parked domain**.`
            : `Could not determine parked status for **${ctx.input.url}**.`
    };
  })
  .build();
