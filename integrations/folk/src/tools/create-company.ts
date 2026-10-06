import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Creates a company in your Folk workspace. Company names are unique: Folk returns the existing company if that name already exists. Supports description, industry, funding info, employee range, foundation year, emails, phones, addresses, URLs, group memberships, and custom field values.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Optional unique retry key. Reuse the same key and identical input after an uncertain response; Folk retains completed keys for 24 hours.'
        ),
      name: z.string().optional().describe('Company name'),
      description: z.string().optional().describe('Short description of the company'),
      industry: z.string().optional().describe('Industry sector'),
      fundingRaised: z.string().optional().describe('Total funding raised (USD)'),
      lastFundingDate: z.string().optional().describe('Most recent funding date (YYYY-MM-DD)'),
      foundationYear: z.string().optional().describe('Year the company was founded (YYYY)'),
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
        .optional()
        .describe('Employee count range'),
      groupIds: z.array(z.string()).optional().describe('Group IDs to add the company to'),
      emails: z.array(z.string()).optional().describe('Email addresses (first is primary)'),
      phones: z.array(z.string()).optional().describe('Phone numbers (first is primary)'),
      addresses: z.array(z.string()).optional().describe('Addresses (first is primary)'),
      urls: z.array(z.string()).optional().describe('URLs (first is primary)'),
      customFieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values keyed by group ID')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the created company'),
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
        .describe('Groups'),
      createdAt: z.string().nullable().describe('Creation timestamp')
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

    let company = await client.createCompany(input, ctx.input.idempotencyKey);

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
        groups: company.groups.map(g => ({ groupId: g.id, groupName: g.name })),
        createdAt: company.createdAt
      },
      message: `Created company **${company.name}** (${company.id})`
    };
  })
  .build();
