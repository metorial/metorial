import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships,
  validateInput
} from '../lib/helpers';
import { spec } from '../spec';

export let manageOpportunity = SlateTool.create(spec, {
  name: 'Manage Opportunity',
  key: 'manage_opportunity',
  description: `Create or update a sales opportunity in Outreach.
Opportunities track deals through the sales pipeline with stages, amounts, and close dates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      opportunityId: z.string().optional().describe('Opportunity ID (required for update)'),
      name: z.string().optional().describe('Opportunity name'),
      amount: z.number().optional().describe('Deal amount'),
      probability: z.number().optional().describe('Win probability (0-100)'),
      closeDate: z.string().optional().describe('Expected close date (ISO 8601)'),
      description: z.string().optional().describe('Description'),
      opportunityType: z.string().optional().describe('Opportunity type'),
      externalSource: z
        .string()
        .optional()
        .describe('Deprecated: unsupported by the current opportunity API. Do not supply.'),
      tags: z.array(z.string()).optional().describe('Tags'),
      accountId: z.string().optional().describe('Account ID'),
      ownerId: z.string().optional().describe('Owner user ID'),
      stageId: z.string().optional().describe('Stage ID')
    })
  )
  .output(
    z.object({
      opportunityId: z.string(),
      name: z.string().optional(),
      amount: z.number().optional(),
      probability: z.number().optional(),
      closeDate: z.string().optional(),
      stageName: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    if (ctx.input.externalSource !== undefined)
      throw createApiServiceError(
        'externalSource is deprecated for opportunities and is not a documented writable attribute. Do not supply it.'
      );
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      name: ctx.input.name,
      amount: ctx.input.amount,
      probability: ctx.input.probability,
      closeDate: ctx.input.closeDate,
      description: ctx.input.description,
      opportunityType: ctx.input.opportunityType,
      tags: ctx.input.tags
    });

    let relationships = mergeRelationships(
      buildRelationship('account', ctx.input.accountId),
      buildRelationship('owner', ctx.input.ownerId),
      buildRelationship('stage', ctx.input.stageId)
    );

    if (ctx.input.action === 'create') {
      let resource = await client.createOpportunity(attributes, relationships);
      let flat = flattenResource(resource);
      return {
        output: {
          opportunityId: flat.id,
          name: flat.name,
          amount: flat.amount,
          probability: flat.probability,
          closeDate: flat.closeDate,
          stageName: flat.stageName,
          createdAt: flat.createdAt,
          updatedAt: flat.updatedAt
        },
        message: `Opportunity **${flat.name ?? flat.id}** created with ID ${flat.id}.`
      };
    }

    if (!ctx.input.opportunityId)
      throw createApiServiceError('opportunityId is required for update');
    let resource = await client.updateOpportunity(
      ctx.input.opportunityId,
      attributes,
      relationships
    );
    let flat = flattenResource(resource);
    return {
      output: {
        opportunityId: flat.id,
        name: flat.name,
        amount: flat.amount,
        probability: flat.probability,
        closeDate: flat.closeDate,
        stageName: flat.stageName,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt
      },
      message: `Opportunity **${flat.name ?? flat.id}** (${flat.id}) updated successfully.`
    };
  })
  .build();
