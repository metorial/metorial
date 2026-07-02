import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

let opportunitySchema = z.object({
  opportunityId: z.number().describe('Unique identifier'),
  name: z.string().optional().describe('Opportunity name'),
  description: z.string().optional().describe('Description'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 update timestamp'),
  closedOn: z.string().optional().describe('Date the opportunity was closed'),
  expectedCloseOn: z.string().optional().describe('Expected close date'),
  probability: z.number().optional().describe('Win probability percentage'),
  value: z.any().optional().describe('Opportunity value with amount and currency'),
  milestone: z.any().optional().describe('Current pipeline milestone'),
  party: z.any().optional().describe('Associated party'),
  owner: z.any().optional().describe('Assigned owner'),
  team: z.any().optional().describe('Assigned team'),
  lostReason: z.string().optional().describe('Reason if the opportunity was lost'),
  tags: z.array(z.any()).optional().describe('Associated tags'),
  fields: z.array(z.any()).optional().describe('Custom fields')
});

export let listOpportunities = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description: `List sales opportunities from Capsule CRM with pagination. Optionally filter by modification date or by party to get opportunities related to a specific contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      partyId: z.number().optional().describe('Filter opportunities by party ID'),
      since: z
        .string()
        .optional()
        .describe('ISO 8601 date to filter opportunities modified after this date'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page, 1-100 (default: 50)'),
      embed: z
        .array(z.enum(['tags', 'fields', 'party', 'milestone', 'missingImportantFields']))
        .optional()
        .describe('Additional data to embed')
    })
  )
  .output(
    z.object({
      opportunities: z.array(opportunitySchema).describe('List of opportunities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.partyId) {
      result = await client.listOpportunitiesByParty(ctx.input.partyId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        embed: ctx.input.embed
      });
    } else {
      result = await client.listOpportunities({
        since: ctx.input.since,
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        embed: ctx.input.embed
      });
    }

    let opportunities = (result.opportunities || []).map((o: any) => ({
      opportunityId: o.id,
      name: o.name,
      description: o.description,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      closedOn: o.closedOn,
      expectedCloseOn: o.expectedCloseOn,
      probability: o.probability,
      value: o.value,
      milestone: o.milestone,
      party: o.party,
      owner: o.owner,
      team: o.team,
      lostReason: o.lostReason,
      tags: o.tags,
      fields: o.fields
    }));

    return {
      output: { opportunities },
      message: `Retrieved **${opportunities.length}** opportunities.`
    };
  })
  .build();
