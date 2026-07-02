import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Enriches a company using a domain or email address. Returns company data including name, domain, industry, headcount, location, LinkedIn URL, and more. Provide either a domain or an email — the domain will be extracted from the email automatically.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Company domain to enrich (e.g. "google.com")'),
      email: z
        .string()
        .optional()
        .describe('Email address to extract domain from and enrich the associated company')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Company name'),
      domain: z.string().optional().describe('Company domain'),
      country: z.string().optional().describe('Country where the company is headquartered'),
      locality: z.string().optional().describe('City/locality of the company'),
      employeesCount: z.number().optional().describe('Estimated number of employees'),
      industry: z.string().optional().describe('Industry classification'),
      linkedinUrl: z.string().optional().describe('LinkedIn company page URL'),
      yearFounded: z.number().optional().describe('Year the company was founded'),
      type: z.string().optional().describe('Company type (e.g. public, private, nonprofit)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    if (!ctx.input.domain && !ctx.input.email) {
      throw new Error('Either domain or email must be provided.');
    }

    let result = await client.enrichCompany({
      domain: ctx.input.domain,
      email: ctx.input.email
    });

    let output = {
      name: result.name ?? undefined,
      domain: result.domain ?? undefined,
      country: result.country ?? undefined,
      locality: result.locality ?? undefined,
      employeesCount:
        result.employees_count != null ? Number(result.employees_count) : undefined,
      industry: result.industry ?? undefined,
      linkedinUrl: result.linkedin_url ?? undefined,
      yearFounded: result.year_founded != null ? Number(result.year_founded) : undefined,
      type: result.type ?? undefined
    };

    return {
      output,
      message: `Company **${output.name ?? output.domain ?? 'unknown'}**${output.industry ? ` in ${output.industry}` : ''}${output.employeesCount ? ` (~${output.employeesCount} employees)` : ''}${output.country ? `, ${output.country}` : ''}.`
    };
  })
  .build();
