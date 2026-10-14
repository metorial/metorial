import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { customFieldValuesSchema } from '../lib/schemas';
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
      ownerId: z
        .number()
        .optional()
        .describe('New owner user ID. Use list_users to discover IDs.'),
      teamId: z.number().optional().describe('New team ID. Use list_teams to discover IDs.'),
      lostReason: z
        .string()
        .optional()
        .describe('Name of an existing lost reason configured in Capsule'),
      fields: customFieldValuesSchema,
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            name: z.string().optional(),
            delete: z.boolean().optional().describe('Remove the tag identified by tagId')
          })
        )
        .optional()
        .describe('Tags to add or remove; unspecified tags remain unchanged')
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
    if (ctx.input.lostReason !== undefined) {
      let reasons = await client.listLostReasons();
      let matches = reasons.filter(reason => reason.name === ctx.input.lostReason);
      if (matches.length !== 1) {
        throw createApiServiceError('Use the exact name of one existing Capsule lost reason.');
      }
      opportunity.lostReason = { id: matches[0]!.id };
    }

    if (ctx.input.valueAmount !== undefined || ctx.input.valueCurrency) {
      opportunity.value = {};
      if (ctx.input.valueAmount !== undefined)
        opportunity.value.amount = ctx.input.valueAmount;
      if (ctx.input.valueCurrency) opportunity.value.currency = ctx.input.valueCurrency;
    }

    if (ctx.input.fields) {
      opportunity.fields = ctx.input.fields.map(field => ({
        definition: { id: field.definitionId },
        value: field.value
      }));
    }

    if (ctx.input.tags) {
      if (ctx.input.tags.some(tag => tag.delete && !tag.tagId)) {
        throw createApiServiceError('Provide tagId when removing a tag.');
      }
      opportunity.tags = ctx.input.tags.map(t =>
        t.tagId ? { id: t.tagId, ...(t.delete ? { _delete: true } : {}) } : { name: t.name }
      );
    }

    let result = await client.updateOpportunity(ctx.input.opportunityId, opportunity);

    return {
      output: {
        opportunityId: result.id,
        name: result.name ?? undefined,
        updatedAt: result.updatedAt ?? undefined
      },
      message: `Updated opportunity **${result.name ?? `#${result.id}`}**.`
    };
  })
  .build();
