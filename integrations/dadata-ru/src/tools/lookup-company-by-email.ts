import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

export let lookupCompanyByEmail = SlateTool.create(spec, {
  name: 'Lookup Company by Email',
  key: 'lookup_company_by_email',
  description: `Identifies the organization that owns a corporate email domain. Given an email address, returns the company name, INN, OGRN, OKVED, employee count, revenue, and city.
Useful for enriching leads and contacts with company data based on their email.`,
  constraints: ['Requires both API Key and Secret Key.', 'Charged at 7 rubles per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to look up the owning company for')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether a company was found for this email'),
      emailSource: z.string().nullable().describe('Source email'),
      emailType: z
        .string()
        .nullable()
        .describe('Email type: PERSONAL, CORPORATE, ROLE, DISPOSABLE'),
      emailLocal: z.string().nullable().describe('Local part of the email'),
      emailDomain: z.string().nullable().describe('Domain of the email'),
      companyDomain: z.string().nullable().describe('Company domain'),
      companyName: z.string().nullable().describe('Company name'),
      companyInn: z.string().nullable().describe('Company INN'),
      companyOgrn: z.string().nullable().describe('Company OGRN'),
      companyOkved: z.string().nullable().describe('Company primary OKVED code'),
      companyOkvedName: z.string().nullable().describe('OKVED activity description'),
      companyEmployeeCount: z.string().nullable().describe('Number of employees'),
      companyIncome: z.string().nullable().describe('Annual income'),
      companyCity: z.string().nullable().describe('City'),
      companyTimezone: z.string().nullable().describe('Timezone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.findCompanyByEmail({ query: ctx.input.email });
    let s = data.suggestions?.[0];

    if (!s) {
      return {
        output: {
          found: false,
          emailSource: ctx.input.email,
          emailType: null,
          emailLocal: null,
          emailDomain: null,
          companyDomain: null,
          companyName: null,
          companyInn: null,
          companyOgrn: null,
          companyOkved: null,
          companyOkvedName: null,
          companyEmployeeCount: null,
          companyIncome: null,
          companyCity: null,
          companyTimezone: null
        },
        message: `No company found for email "${ctx.input.email}".`
      };
    }

    return {
      output: {
        found: true,
        emailSource: s.data?.email?.source ?? null,
        emailType: s.data?.email?.type ?? null,
        emailLocal: s.data?.email?.local ?? null,
        emailDomain: s.data?.email?.domain ?? null,
        companyDomain: s.data?.company?.domain ?? null,
        companyName: s.data?.company?.name ?? null,
        companyInn: s.data?.company?.inn ?? null,
        companyOgrn: s.data?.company?.ogrn ?? null,
        companyOkved: s.data?.company?.okved ?? null,
        companyOkvedName: s.data?.company?.okved_name ?? null,
        companyEmployeeCount: s.data?.company?.employee_count ?? null,
        companyIncome: s.data?.company?.income ?? null,
        companyCity: s.data?.company?.city ?? null,
        companyTimezone: s.data?.company?.timezone ?? null
      },
      message: `Found company **${s.data?.company?.name || 'Unknown'}** (INN: ${s.data?.company?.inn || 'N/A'}) for email "${ctx.input.email}".`
    };
  })
  .build();
