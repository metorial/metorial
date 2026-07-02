import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let getDomainLogo = SlateTool.create(spec, {
  name: 'Get Domain Logo',
  key: 'get_domain_logo',
  description: `Retrieves a company's up-to-date logo in real time from any URL or domain. Returns a direct URL to the logo image, working even for the newest and most obscure brands.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to retrieve the logo for')
    })
  )
  .output(
    z.object({
      logoUrl: z.string().nullable().describe('Direct URL to the company logo image'),
      domainUrl: z.string().nullable().optional().describe('The resolved domain URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.logo(ctx.input.url);

    let domain = result.domain ?? {};

    let output = {
      logoUrl: domain.logo_url ?? null,
      domainUrl: domain.domain_url ?? null
    };

    return {
      output,
      message: output.logoUrl
        ? `Found logo for **${ctx.input.url}**: ${output.logoUrl}`
        : `No logo found for **${ctx.input.url}**.`
    };
  })
  .build();
