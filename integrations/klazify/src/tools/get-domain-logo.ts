import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { refreshSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getDomainLogo = SlateTool.create(spec, {
  name: 'Get Domain Logo',
  key: 'get_domain_logo',
  description: `Retrieves a company's logo from a URL or domain as a downloadable image and returns its hosted URL. Uses cached data unless refresh is requested.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to retrieve the logo for'),
      refresh: refreshSchema
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
    let result = await client.logo(ctx.input.url, ctx.input.refresh);

    let domain = result.domain ?? {};

    let output = {
      logoUrl: domain.logo_url ?? null,
      domainUrl: domain.domain_url ?? null
    };

    if (output.logoUrl) {
      await ctx.addAttachment({ type: 'url', url: output.logoUrl });
    }

    return {
      output,
      message: output.logoUrl
        ? `Found logo for **${ctx.input.url}**: ${output.logoUrl}`
        : `No logo found for **${ctx.input.url}**.`
    };
  })
  .build();
