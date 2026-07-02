import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let updateOpportunity = SlateTool.create(spec, {
  name: 'Update Opportunity',
  key: 'update_opportunity',
  description: `Update an existing sales opportunity in Capsule CRM. Modify its name, value, milestone, probability, expected close date, and other properties.`
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      milestoneId: z.number().optional().describe('New milestone/stage ID'),
      valueAmount: z.number().optional().describe('Updated deal value amount'),
      valueCurrency: z.string().optional().describe('Updated currency code'),
      expectedCloseOn: z
        .string()
        .optional()
        .describe('Updated expected close date (YYYY-MM-DD)'),
      probability: z.number().optional().describe('Updated win probability (0-100)'),
      ownerId: z.number().optional().describe('New owner user ID'),
      teamId: z.number().optional().describe('New team ID'),
      lostReason: z.string().optional().describe('Reason for losing the opportunity'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Tags to set')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the updated opportunity'),
      name: z.string().optional().describe('Name'),
      updatedAt: z.string().optional().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let opportunity: Record<string, any> = {};

    if (ctx.input.name !== undefined) opportunity.name = ctx.input.name;
    if (ctx.input.description !== undefined) opportunity.description = ctx.input.description;
    if (ctx.input.milestoneId) opportunity.milestone = { id: ctx.input.milestoneId };
    if (ctx.input.expectedCloseOn !== undefined)
      opportunity.expectedCloseOn = ctx.input.expectedCloseOn;
    if (ctx.input.probability !== undefined) opportunity.probability = ctx.input.probability;
    if (ctx.input.ownerId) opportunity.owner = { id: ctx.input.ownerId };
    if (ctx.input.teamId) opportunity.team = { id: ctx.input.teamId };
    if (ctx.input.lostReason !== undefined) opportunity.lostReason = ctx.input.lostReason;

    if (ctx.input.valueAmount !== undefined || ctx.input.valueCurrency) {
      opportunity.value = {};
      if (ctx.input.valueAmount !== undefined)
        opportunity.value.amount = ctx.input.valueAmount;
      if (ctx.input.valueCurrency) opportunity.value.currency = ctx.input.valueCurrency;
    }

    if (ctx.input.tags) {
      opportunity.tags = ctx.input.tags.map(t =>
        t.tagId ? { id: t.tagId } : { name: t.name }
      );
    }

    let result = await client.updateOpportunity(ctx.input.opportunityId, opportunity);

    return {
      output: {
        opportunityId: result.id,
        name: result.name,
        updatedAt: result.updatedAt
      },
      message: `Updated opportunity **${result.name ?? `#${result.id}`}**.`
    };
  })
  .build();
