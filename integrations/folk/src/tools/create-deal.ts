import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Creates a new deal within a specific group in your Folk workspace. Deals track opportunities, projects, or other outcome-driven items. You can associate people and companies that belong to the same group.`,
  instructions: [
    'The groupId and objectType are required. Use "Deals" as the objectType unless you have a custom deal type.',
    'People and companies referenced must already belong to the same group.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to create the deal in'),
      objectType: z.string().describe('Deal object type name (e.g. "Deals")'),
      name: z.string().optional().describe('Deal name'),
      companyIds: z.array(z.string()).optional().describe('IDs of companies to associate'),
      personIds: z.array(z.string()).optional().describe('IDs of people to associate'),
      customFieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values for the deal')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the created deal'),
      name: z.string().describe('Deal name'),
      companies: z
        .array(
          z.object({
            companyId: z.string(),
            companyName: z.string()
          })
        )
        .describe('Associated companies'),
      people: z
        .array(
          z.object({
            personId: z.string(),
            personName: z.string()
          })
        )
        .describe('Associated people'),
      customFieldValues: z.record(z.string(), z.unknown()).describe('Custom field values'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {};
    if (ctx.input.name) input.name = ctx.input.name;
    if (ctx.input.customFieldValues) input.customFieldValues = ctx.input.customFieldValues;
    if (ctx.input.companyIds) {
      input.companies = ctx.input.companyIds.map(id => ({ id }));
    }
    if (ctx.input.personIds) {
      input.people = ctx.input.personIds.map(id => ({ id }));
    }

    let deal = await client.createDeal(ctx.input.groupId, ctx.input.objectType, input);

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        companies: deal.companies.map(c => ({ companyId: c.id, companyName: c.name })),
        people: deal.people.map(p => ({ personId: p.id, personName: p.fullName })),
        customFieldValues: deal.customFieldValues,
        createdAt: deal.createdAt
      },
      message: `Created deal **${deal.name}** (${deal.id})`
    };
  })
  .build();
