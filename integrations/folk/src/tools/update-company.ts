import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Updates an existing company in your Folk workspace. Supports partial updates to any field.`,
  instructions: [
    'Array fields (emails, phones, addresses, urls, groups) replace the entire list when provided — include all desired values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('Updated company name'),
      description: z.string().optional().describe('Updated description'),
      industry: z.string().nullable().optional().describe('Updated industry or null to clear'),
      fundingRaised: z
        .string()
        .nullable()
        .optional()
        .describe('Updated funding raised or null to clear'),
      lastFundingDate: z
        .string()
        .nullable()
        .optional()
        .describe('Updated last funding date (YYYY-MM-DD) or null to clear'),
      foundationYear: z
        .string()
        .nullable()
        .optional()
        .describe('Updated foundation year (YYYY) or null to clear'),
      employeeRange: z
        .enum([
          '1-10',
          '11-50',
          '51-200',
          '201-500',
          '501-1000',
          '1001-5000',
          '5001-10000',
          '10000+'
        ])
        .nullable()
        .optional()
        .describe('Updated employee range or null to clear'),
      groupIds: z.array(z.string()).optional().describe('Updated group IDs (replaces all)'),
      emails: z.array(z.string()).optional().describe('Updated emails (replaces all)'),
      phones: z.array(z.string()).optional().describe('Updated phones (replaces all)'),
      addresses: z.array(z.string()).optional().describe('Updated addresses (replaces all)'),
      urls: z.array(z.string()).optional().describe('Updated URLs (replaces all)'),
      customFieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom field values keyed by group ID')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the updated company'),
      name: z.string().describe('Company name'),
      description: z.string().describe('Description'),
      industry: z.string().nullable().describe('Industry'),
      fundingRaised: z.string().nullable().describe('Funding raised'),
      lastFundingDate: z.string().nullable().describe('Last funding date'),
      foundationYear: z.string().nullable().describe('Foundation year'),
      employeeRange: z.string().nullable().describe('Employee range'),
      emails: z.array(z.string()).describe('Emails'),
      phones: z.array(z.string()).describe('Phone numbers'),
      addresses: z.array(z.string()).describe('Addresses'),
      urls: z.array(z.string()).describe('URLs'),
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            groupName: z.string()
          })
        )
        .describe('Groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) input.name = ctx.input.name;
    if (ctx.input.description !== undefined) input.description = ctx.input.description;
    if (ctx.input.industry !== undefined) input.industry = ctx.input.industry;
    if (ctx.input.fundingRaised !== undefined) input.fundingRaised = ctx.input.fundingRaised;
    if (ctx.input.lastFundingDate !== undefined)
      input.lastFundingDate = ctx.input.lastFundingDate;
    if (ctx.input.foundationYear !== undefined)
      input.foundationYear = ctx.input.foundationYear;
    if (ctx.input.employeeRange !== undefined) input.employeeRange = ctx.input.employeeRange;
    if (ctx.input.emails !== undefined) input.emails = ctx.input.emails;
    if (ctx.input.phones !== undefined) input.phones = ctx.input.phones;
    if (ctx.input.addresses !== undefined) input.addresses = ctx.input.addresses;
    if (ctx.input.urls !== undefined) input.urls = ctx.input.urls;
    if (ctx.input.customFieldValues !== undefined)
      input.customFieldValues = ctx.input.customFieldValues;
    if (ctx.input.groupIds !== undefined) {
      input.groups = ctx.input.groupIds.map(id => ({ id }));
    }

    let company = await client.updateCompany(ctx.input.companyId, input);

    return {
      output: {
        companyId: company.id,
        name: company.name,
        description: company.description,
        industry: company.industry,
        fundingRaised: company.fundingRaised,
        lastFundingDate: company.lastFundingDate,
        foundationYear: company.foundationYear,
        employeeRange: company.employeeRange,
        emails: company.emails,
        phones: company.phones,
        addresses: company.addresses,
        urls: company.urls,
        groups: company.groups.map(g => ({ groupId: g.id, groupName: g.name }))
      },
      message: `Updated company **${company.name}** (${company.id})`
    };
  })
  .build();
