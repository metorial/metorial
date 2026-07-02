import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Updates an existing deal in a Folk group. Supports changing the deal name, associated companies and people, and custom field values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group the deal belongs to'),
      objectType: z.string().describe('Deal object type name (e.g. "Deals")'),
      dealId: z.string().describe('ID of the deal to update'),
      name: z.string().optional().describe('Updated deal name'),
      companyIds: z
        .array(z.string())
        .optional()
        .describe('Updated company IDs (replaces all)'),
      personIds: z.array(z.string()).optional().describe('Updated people IDs (replaces all)'),
      customFieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom field values')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the updated deal'),
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
      customFieldValues: z.record(z.string(), z.unknown()).describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) input.name = ctx.input.name;
    if (ctx.input.customFieldValues !== undefined)
      input.customFieldValues = ctx.input.customFieldValues;
    if (ctx.input.companyIds !== undefined) {
      input.companies = ctx.input.companyIds.map(id => ({ id }));
    }
    if (ctx.input.personIds !== undefined) {
      input.people = ctx.input.personIds.map(id => ({ id }));
    }

    let deal = await client.updateDeal(
      ctx.input.groupId,
      ctx.input.objectType,
      ctx.input.dealId,
      input
    );

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        companies: deal.companies.map(c => ({ companyId: c.id, companyName: c.name })),
        people: deal.people.map(p => ({ personId: p.id, personName: p.fullName })),
        customFieldValues: deal.customFieldValues
      },
      message: `Updated deal **${deal.name}** (${deal.id})`
    };
  })
  .build();
