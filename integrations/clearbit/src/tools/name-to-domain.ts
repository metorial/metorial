import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

export let nameToDomain = SlateTool.create(spec, {
  name: 'Name to Domain',
  key: 'name_to_domain',
  description: `Convert a company name to its website domain. Provide a partial or full company name to retrieve the company's domain, full name, and logo. Useful for resolving company domains when only a name is known.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Company name or partial name to look up')
    })
  )
  .output(
    z.object({
      name: z.string().nullable().describe('Full company name'),
      domain: z.string().nullable().describe('Company website domain'),
      logo: z.string().nullable().describe('Company logo URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let result = await client.nameToDomain({ name: ctx.input.companyName });

    return {
      output: {
        name: result.name,
        domain: result.domain,
        logo: result.logo
      },
      message: result.domain
        ? `Resolved **${ctx.input.companyName}** to domain \`${result.domain}\`.`
        : `Could not resolve "${ctx.input.companyName}" to a domain.`
    };
  })
  .build();
