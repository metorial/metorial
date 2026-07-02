import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieves a single company by its ID, returning all details including name, industry, funding info, contact information, group memberships, and custom field values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to retrieve')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the company'),
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
      customFieldValues: z.record(z.string(), z.unknown()).describe('Custom field values'),
      createdAt: z.string().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let company = await client.getCompany(ctx.input.companyId);

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
        customFieldValues: company.customFieldValues,
        createdAt: company.createdAt
      },
      message: `Found company **${company.name}** (${company.id})`
    };
  })
  .build();
