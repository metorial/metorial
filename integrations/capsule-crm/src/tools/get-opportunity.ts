import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let getOpportunity = SlateTool.create(spec, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description:
    'Retrieve a single Capsule CRM opportunity by ID, including its state, assignment, and linked records.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      opportunityId: z
        .number()
        .int()
        .positive()
        .describe('Opportunity ID. Use list_opportunities to discover IDs.'),
      embed: z
        .array(z.enum(['tags', 'fields', 'party', 'milestone', 'missingImportantFields']))
        .optional()
        .describe('Additional related data to include')
    })
  )
  .output(
    z.object({
      opportunityId: z.number(),
      name: z.string().nullish(),
      description: z.string().nullish(),
      createdAt: z.string().nullish(),
      updatedAt: z.string().nullish(),
      closedOn: z.string().nullish(),
      expectedCloseOn: z.string().nullish(),
      probability: z.number().nullish(),
      value: z.any().nullish(),
      milestone: z.any().nullish(),
      party: z.any().nullish(),
      owner: z.any().nullish(),
      team: z.any().nullish(),
      lostReason: z.any().nullish(),
      tags: z.array(z.any()).nullish(),
      fields: z.array(z.any()).nullish(),
      missingImportantFields: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });
    let result = await client.getOpportunity(ctx.input.opportunityId, ctx.input.embed);
    return {
      output: {
        opportunityId: result.id,
        name: result.name,
        description: result.description,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        closedOn: result.closedOn,
        expectedCloseOn: result.expectedCloseOn,
        probability: result.probability,
        value: result.value,
        milestone: result.milestone,
        party: result.party,
        owner: result.owner,
        team: result.team,
        lostReason: result.lostReason,
        tags: result.tags,
        fields: result.fields,
        missingImportantFields: result.missingImportantFields
      },
      message: `Retrieved opportunity **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
