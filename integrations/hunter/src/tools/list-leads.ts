import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `Retrieve leads stored in Hunter with filtering and pagination. Filter by email, name, company, industry, verification status, sending status, and more. Optionally filter by a specific leads list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of leads to return (1-1000, default 20)'),
      offset: z.number().optional().describe('Offset for pagination (max 100000)'),
      leadListId: z.number().optional().describe('Filter leads by a specific list ID'),
      email: z.string().optional().describe('Filter by email address'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      company: z.string().optional().describe('Filter by company name'),
      industry: z.string().optional().describe('Filter by industry'),
      verificationStatus: z.string().optional().describe('Filter by verification status'),
      sendingStatus: z.string().optional().describe('Filter by sending status')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.number().describe('Lead ID'),
            email: z.string().nullable().describe('Email address'),
            firstName: z.string().nullable().describe('First name'),
            lastName: z.string().nullable().describe('Last name'),
            position: z.string().nullable().describe('Job position'),
            company: z.string().nullable().describe('Company name'),
            companyIndustry: z.string().nullable().describe('Company industry'),
            website: z.string().nullable().describe('Website URL'),
            countryCode: z.string().nullable().describe('Country code'),
            linkedinUrl: z.string().nullable().describe('LinkedIn URL'),
            verificationStatus: z.string().nullable().describe('Verification status')
          })
        )
        .describe('List of leads'),
      total: z.number().describe('Total number of leads matching filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLeads({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      leadListId: ctx.input.leadListId,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      company: ctx.input.company,
      industry: ctx.input.industry,
      verificationStatus: ctx.input.verificationStatus,
      sendingStatus: ctx.input.sendingStatus
    });

    let leads = (result.data?.leads || []).map((lead: any) => ({
      leadId: lead.id,
      email: lead.email ?? null,
      firstName: lead.first_name ?? null,
      lastName: lead.last_name ?? null,
      position: lead.position ?? null,
      company: lead.company ?? null,
      companyIndustry: lead.company_industry ?? null,
      website: lead.website ?? null,
      countryCode: lead.country_code ?? null,
      linkedinUrl: lead.linkedin_url ?? null,
      verificationStatus: lead.verification?.status ?? null
    }));

    return {
      output: {
        leads,
        total: result.meta?.total ?? leads.length
      },
      message: `Retrieved **${leads.length}** leads.`
    };
  })
  .build();
