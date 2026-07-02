import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Get company information by providing a domain, LinkedIn company URL, or company name. Returns details such as company name, domain, size, and industry.`,
  constraints: [
    'Uses 1 credit per successful result.',
    'Provide at least one of: domain, linkedinUrl, or companyName.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Company website domain, e.g. "stripe.com".'),
      linkedinUrl: z.string().optional().describe('LinkedIn company page URL.'),
      companyName: z.string().optional().describe('Name of the company.')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Company name.'),
      domain: z.string().optional().describe('Company website domain.'),
      companySize: z.string().optional().describe('Company size range, e.g. "1001-5000".'),
      industry: z.string().optional().describe('Company industry.'),
      linkedinUrl: z.string().optional().describe('LinkedIn company page URL.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.domain && !ctx.input.linkedinUrl && !ctx.input.companyName) {
      throw new Error('Provide at least one of: domain, linkedinUrl, or companyName.');
    }

    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.enrichCompany({
      domain: ctx.input.domain,
      linkedinUrl: ctx.input.linkedinUrl,
      name: ctx.input.companyName
    });

    return {
      output: {
        name: result?.name ?? undefined,
        domain: result?.domain ?? undefined,
        companySize: result?.company_size ?? result?.companySize ?? undefined,
        industry: result?.industry ?? undefined,
        linkedinUrl: result?.linkedin_url ?? result?.linkedinUrl ?? undefined
      },
      message: result?.name
        ? `Found company **${result.name}**${result?.industry ? ` in ${result.industry}` : ''}${result?.company_size ? ` (${result.company_size} employees)` : ''}.`
        : `No company information found for the given input.`
    };
  })
  .build();
