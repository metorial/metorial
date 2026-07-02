import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let getCompanyData = SlateTool.create(spec, {
  name: 'Get Company Data',
  key: 'get_company_data',
  description: `Retrieves a full company profile from a domain URL or email address, including company name, location (city, state, country), employee range, estimated revenue, funding raised, industry tags, and technology stack.`,
  instructions: [
    'Provide a full URL including the protocol (e.g., https://example.com) or an email address.',
    'Revenue info is estimated and may be updated monthly for public companies or estimated based on location and employee count for private companies.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL, domain, or email address to look up company data for')
    })
  )
  .output(
    z.object({
      name: z.string().nullable().describe('Company name'),
      city: z.string().nullable().describe('Headquarters city'),
      stateCode: z.string().nullable().describe('Headquarters state/province code'),
      countryCode: z.string().nullable().describe('Headquarters country code'),
      employeesRange: z
        .string()
        .nullable()
        .describe('Estimated number of employees (e.g., "100K+")'),
      revenue: z.number().nullable().describe('Estimated annual revenue'),
      raised: z.string().nullable().describe('Total funding raised'),
      tags: z.array(z.string()).nullable().describe('Industry classification tags'),
      tech: z.array(z.string()).nullable().describe('Technology stack identifiers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.companyData(ctx.input.url);

    let company = result.objects?.company ?? {};

    let output = {
      name: company.name ?? null,
      city: company.city ?? null,
      stateCode: company.stateCode ?? null,
      countryCode: company.countryCode ?? null,
      employeesRange: company.employeesRange ?? null,
      revenue: company.revenue ?? null,
      raised: company.raised ?? null,
      tags: company.tags ?? null,
      tech: company.tech ?? null
    };

    return {
      output,
      message: output.name
        ? `Found company **${output.name}** (${output.countryCode ?? 'Unknown location'}, ${output.employeesRange ?? 'Unknown size'}).`
        : `No company data found for **${ctx.input.url}**.`
    };
  })
  .build();
