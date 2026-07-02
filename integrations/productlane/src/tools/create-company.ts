import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in Productlane. Companies represent organizations whose contacts provide feedback. You can set domains for automatic contact linking, revenue, size, status, and tier information.`
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Associated domain names (e.g. ["example.com"])'),
      autoAdd: z
        .boolean()
        .optional()
        .describe('Automatically link contacts by matching email domain'),
      externalIds: z.array(z.string()).optional().describe('External IDs from other systems'),
      size: z.number().nullable().optional().describe('Employee count'),
      revenue: z.number().nullable().optional().describe('Company revenue'),
      tierId: z.string().nullable().optional().describe('Tier ID'),
      tierName: z
        .string()
        .nullable()
        .optional()
        .describe('Tier name (used if tierId is not provided)'),
      statusId: z.string().nullable().optional().describe('Status ID'),
      statusName: z.string().nullable().optional().describe('Status name'),
      statusColor: z.string().nullable().optional().describe('Status color')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the created company'),
      name: z.string().describe('Company name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCompany(ctx.input);

    return {
      output: {
        companyId: result.id,
        name: result.name,
        createdAt: result.createdAt
      },
      message: `Created company **${result.name}** (${result.id}).`
    };
  })
  .build();
