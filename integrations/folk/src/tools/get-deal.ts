import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieves a single deal by its ID within a group. Returns the deal name, associated companies and people, custom field values, and creation info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group the deal belongs to'),
      objectType: z.string().describe('Deal object type name (e.g. "Deals")'),
      dealId: z.string().describe('ID of the deal to retrieve')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the deal'),
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
    let deal = await client.getDeal(ctx.input.groupId, ctx.input.objectType, ctx.input.dealId);

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        companies: deal.companies.map(c => ({ companyId: c.id, companyName: c.name })),
        people: deal.people.map(p => ({ personId: p.id, personName: p.fullName })),
        customFieldValues: deal.customFieldValues,
        createdAt: deal.createdAt
      },
      message: `Found deal **${deal.name}** (${deal.id})`
    };
  })
  .build();
