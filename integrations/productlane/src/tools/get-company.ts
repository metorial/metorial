import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve detailed information about a specific company, including its upvotes and associated projects.`,
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
      companyId: z.string().describe('Unique ID of the company'),
      name: z.string().describe('Company name'),
      domains: z.array(z.string()).describe('Associated domains'),
      autoAdd: z
        .boolean()
        .nullable()
        .describe('Whether contacts are auto-linked by email domain'),
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
      updatedAt: z.string().describe('Last updated timestamp'),
      upvotes: z.any().optional().describe('Upvotes associated with this company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCompany(ctx.input.companyId);
    let c = result.company || result;

    return {
      output: {
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
        updatedAt: c.updatedAt,
        upvotes: result.upvotes
      },
      message: `Retrieved company **${c.name}** (${c.id}).`
    };
  })
  .build();
