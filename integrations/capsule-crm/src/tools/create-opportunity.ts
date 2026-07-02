import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let createOpportunity = SlateTool.create(spec, {
  name: 'Create Opportunity',
  key: 'create_opportunity',
  description: `Create a new sales opportunity in Capsule CRM linked to a contact and pipeline milestone. Set the deal value, expected close date, and win probability.`,
  instructions: [
    'A party and milestone are required when creating an opportunity.',
    'Use the List Pipelines tool to find available pipeline and milestone IDs.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the opportunity'),
      description: z.string().optional().describe('Description of the opportunity'),
      partyId: z.number().describe('ID of the primary party (contact) for this opportunity'),
      milestoneId: z.number().describe('ID of the pipeline milestone/stage'),
      valueAmount: z.number().optional().describe('Deal value amount'),
      valueCurrency: z.string().optional().describe('Currency code (e.g. USD, GBP, EUR)'),
      expectedCloseOn: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      probability: z.number().optional().describe('Win probability percentage (0-100)'),
      ownerId: z.number().optional().describe('Owner user ID'),
      teamId: z.number().optional().describe('Team ID'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional().describe('Existing tag ID'),
            name: z.string().optional().describe('Tag name')
          })
        )
        .optional()
        .describe('Tags to associate')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the created opportunity'),
      name: z.string().describe('Name of the opportunity'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let opportunity: Record<string, any> = {
      name: ctx.input.name,
      party: { id: ctx.input.partyId },
      milestone: { id: ctx.input.milestoneId }
    };

    if (ctx.input.description) opportunity.description = ctx.input.description;
    if (ctx.input.expectedCloseOn) opportunity.expectedCloseOn = ctx.input.expectedCloseOn;
    if (ctx.input.probability !== undefined) opportunity.probability = ctx.input.probability;
    if (ctx.input.ownerId) opportunity.owner = { id: ctx.input.ownerId };
    if (ctx.input.teamId) opportunity.team = { id: ctx.input.teamId };

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

    let result = await client.createOpportunity(opportunity);

    return {
      output: {
        opportunityId: result.id,
        name: result.name,
        createdAt: result.createdAt
      },
      message: `Created opportunity **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
