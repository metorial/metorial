import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearbitClient } from '../lib/client';
import { spec } from '../spec';

export let revealCompany = SlateTool.create(spec, {
  name: 'Reveal Company by IP',
  key: 'reveal_company',
  description: `Identify the company behind an IP address. De-anonymize website traffic to discover which companies are visiting your site. Returns the associated company profile with firmographic data. Does not identify specific individuals — only the company.`,
  constraints: [
    'Only identifies companies, not individual people.',
    'ISP IPs (e.g., residential) will return type "isp" without company data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IP address to look up (IPv4 or IPv6)')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The looked-up IP address'),
      fuzzy: z.boolean().describe('Whether the match is fuzzy'),
      type: z
        .string()
        .nullable()
        .describe('Type of result: Company, ISP, Education, Government'),
      domain: z.string().nullable().describe('Company domain'),
      confidenceScore: z.string().nullable().describe('Confidence of the match'),
      companyName: z.string().nullable().describe('Company name'),
      companyDomain: z.string().nullable().describe('Company domain'),
      companyIndustry: z.string().nullable().describe('Company industry'),
      companySector: z.string().nullable().describe('Company sector'),
      companyEmployeesRange: z.string().nullable().describe('Employee count range'),
      companyLocation: z.string().nullable().describe('Company location'),
      companyDescription: z.string().nullable().describe('Company description'),
      companyLogo: z.string().nullable().describe('Company logo URL'),
      companyType: z.string().nullable().describe('Company type'),
      companyTech: z.array(z.string()).nullable().describe('Technologies used'),
      companyTags: z.array(z.string()).nullable().describe('Clearbit tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearbitClient({ token: ctx.auth.token });

    let result = await client.reveal({ ip: ctx.input.ip });

    let output = {
      ip: result.ip,
      fuzzy: result.fuzzy,
      type: result.type,
      domain: result.domain,
      confidenceScore: result.confidence,
      companyName: result.company?.name ?? null,
      companyDomain: result.company?.domain ?? null,
      companyIndustry: result.company?.category?.industry ?? null,
      companySector: result.company?.category?.sector ?? null,
      companyEmployeesRange: result.company?.metrics?.employeesRange ?? null,
      companyLocation: result.company?.location ?? null,
      companyDescription: result.company?.description ?? null,
      companyLogo: result.company?.logo ?? null,
      companyType: result.company?.type ?? null,
      companyTech: result.company?.tech ?? null,
      companyTags: result.company?.tags ?? null
    };

    if (output.companyName) {
      return {
        output,
        message: `IP \`${ctx.input.ip}\` belongs to **${output.companyName}** (${output.type ?? 'unknown type'}).`
      };
    }

    return {
      output,
      message: `IP \`${ctx.input.ip}\` could not be resolved to a company (type: ${output.type ?? 'unknown'}).`
    };
  })
  .build();
