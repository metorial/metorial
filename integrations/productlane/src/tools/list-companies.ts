import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companySchema = z.object({
  companyId: z.string().describe('Unique ID of the company'),
  name: z.string().describe('Company name'),
  domains: z.array(z.string()).describe('Associated domains'),
  autoAdd: z.boolean().nullable().describe('Whether contacts are auto-linked by email domain'),
  size: z.number().nullable().describe('Employee count'),
  revenue: z.number().nullable().describe('Company revenue'),
  tierId: z.string().nullable().describe('Tier ID'),
  tierName: z.string().nullable().describe('Tier name'),
  statusId: z.string().nullable().describe('Status ID'),
  statusName: z.string().nullable().describe('Status name'),
  statusColor: z.string().nullable().describe('Status color'),
  externalIds: z.array(z.string()).describe('External IDs'),
  workspaceId: z.string().describe('Workspace ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List companies in your Productlane workspace. Supports filtering by domain or name, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Filter companies by domain'),
      name: z.string().optional().describe('Filter companies by name'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      take: z.number().optional().describe('Number of records to return (max 100)')
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema).describe('List of companies'),
      hasMore: z.boolean().describe('Whether more results are available'),
      count: z.number().describe('Total count of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCompanies({
      domain: ctx.input.domain,
      name: ctx.input.name,
      skip: ctx.input.skip,
      take: ctx.input.take
    });

    let companies = (result.companies || []).map((c: any) => ({
      companyId: c.id,
      name: c.name,
      domains: c.domains || [],
      autoAdd: c.autoAdd ?? null,
      size: c.size ?? null,
      revenue: c.revenue ?? null,
      tierId: c.tierId ?? null,
      tierName: c.tierName ?? null,
      statusId: c.statusId ?? null,
      statusName: c.statusName ?? null,
      statusColor: c.statusColor ?? null,
      externalIds: c.externalIds || [],
      workspaceId: c.workspaceId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        companies,
        hasMore: result.hasMore ?? false,
        count: result.count ?? companies.length
      },
      message: `Found **${result.count ?? companies.length}** companies.${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
