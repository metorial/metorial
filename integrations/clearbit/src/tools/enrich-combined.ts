import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCombined = SlateTool.create(spec, {
  name: 'Enrich Person & Company',
  key: 'enrich_combined',
  description: `Look up both person and company data simultaneously from a single email address. Returns the person's profile alongside their employer's company details. More efficient than calling person and company enrichment separately.`,
  instructions: [
    'Returns both person and company data in one call. If only person or company data is found, the other field may be null.'
  ],
  constraints: ['Rate limited to 600 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to look up')
    })
  )
  .output(
    z.object({
      person: z
        .object({
          personId: z.string().describe('Clearbit person identifier'),
          fullName: z.string().nullable().describe('Full name'),
          givenName: z.string().nullable().describe('First name'),
          familyName: z.string().nullable().describe('Last name'),
          email: z.string().nullable().describe('Email address'),
          avatar: z.string().nullable().describe('Avatar URL'),
          location: z.string().nullable().describe('Location'),
          title: z.string().nullable().describe('Job title'),
          role: z.string().nullable().describe('Job role'),
          seniority: z.string().nullable().describe('Seniority level'),
          companyName: z.string().nullable().describe('Employer name'),
          linkedinHandle: z.string().nullable().describe('LinkedIn handle'),
          twitterHandle: z.string().nullable().describe('Twitter handle')
        })
        .nullable(),
      company: z
        .object({
          companyId: z.string().describe('Clearbit company identifier'),
          name: z.string().nullable().describe('Company name'),
          domain: z.string().nullable().describe('Company domain'),
          description: z.string().nullable().describe('Company description'),
          industry: z.string().nullable().describe('Industry'),
          sector: z.string().nullable().describe('Sector'),
          employeesRange: z.string().nullable().describe('Employee count range'),
          estimatedAnnualRevenue: z
            .string()
            .nullable()
            .describe('Estimated annual revenue range'),
          raised: z.number().nullable().describe('Total funding raised'),
          location: z.string().nullable().describe('Company location'),
          logo: z.string().nullable().describe('Logo URL'),
          tech: z.array(z.string()).nullable().describe('Technologies used'),
          tags: z.array(z.string()).nullable().describe('Clearbit tags'),
          type: z.string().nullable().describe('Company type')
        })
        .nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let result = await client.findCombined({ email: ctx.input.email });

    let person = result.person
      ? {
          personId: result.person.id,
          fullName: result.person.name?.fullName ?? null,
          givenName: result.person.name?.givenName ?? null,
          familyName: result.person.name?.familyName ?? null,
          email: result.person.email,
          avatar: result.person.avatar,
          location: result.person.location,
          title: result.person.employment?.title ?? null,
          role: result.person.employment?.role ?? null,
          seniority: result.person.employment?.seniority ?? null,
          companyName: result.person.employment?.name ?? null,
          linkedinHandle: result.person.linkedin?.handle ?? null,
          twitterHandle: result.person.twitter?.handle ?? null
        }
      : null;

    let company = result.company
      ? {
          companyId: result.company.id,
          name: result.company.name,
          domain: result.company.domain,
          description: result.company.description,
          industry: result.company.category?.industry ?? null,
          sector: result.company.category?.sector ?? null,
          employeesRange: result.company.metrics?.employeesRange ?? null,
          estimatedAnnualRevenue: result.company.metrics?.estimatedAnnualRevenue ?? null,
          raised: result.company.metrics?.raised ?? null,
          location: result.company.location,
          logo: result.company.logo,
          tech: result.company.tech,
          tags: result.company.tags,
          type: result.company.type
        }
      : null;

    let parts: string[] = [];
    if (person?.fullName) parts.push(`person **${person.fullName}**`);
    if (company?.name) parts.push(`company **${company.name}**`);

    return {
      output: { person, company },
      message:
        parts.length > 0 ? `Found ${parts.join(' at ')}.` : 'Lookup returned no results.'
    };
  })
  .build();
