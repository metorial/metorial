import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let opportunityFields = z
  .object({
    reference: z.string().optional().describe('Opportunity reference or title'),
    typeId: z.number().optional().describe('Opportunity type ID'),
    statusId: z.number().optional().describe('Opportunity status ID'),
    total: z.number().optional().describe('Opportunity amount/value'),
    currencyId: z.number().optional().describe('Currency ID'),
    accountId1: z.number().optional().describe('Primary account ID'),
    accountId2: z.number().optional().describe('Secondary account ID'),
    accountId3: z.number().optional().describe('Tertiary account ID'),
    salesForecastDate: z.string().optional().describe('Expected closing date (ISO 8601)'),
    salesProbability: z.number().optional().describe('Win probability percentage (0-100)'),
    salesRepId: z.number().optional().describe('Assigned sales rep ID'),
    comments: z.string().optional().describe('Comments or notes'),
    branchId: z.number().optional().describe('Branch ID'),
    address1: z.string().optional().describe('Primary address'),
    address2: z.string().optional().describe('Secondary address'),
    city: z.string().optional().describe('City'),
    postcode: z.string().optional().describe('Postal code'),
    region: z.string().optional().describe('Region or state'),
    countryId: z.number().optional().describe('Country ID'),
    closedDate: z.string().optional().describe('Actual closing date (ISO 8601)'),
    wonDate: z.string().optional().describe('Won date (ISO 8601)'),
    lostDate: z.string().optional().describe('Lost date (ISO 8601)'),
    latitude: z.number().optional().describe('Latitude'),
    longitude: z.number().optional().describe('Longitude'),
    extId: z.string().optional().describe('External system ID for synchronization')
  })
  .describe('Opportunity fields to set');

export let manageOpportunity = SlateTool.create(spec, {
  name: 'Manage Opportunity',
  key: 'manage_opportunity',
  description: `Create, update, or delete sales opportunity records in ForceManager.
Opportunities track deals through their lifecycle with amounts, probabilities, and close dates. Supports multiple associated accounts.`,
  instructions: [
    'Use the "list of values" tool to look up valid statusId, typeId, and currencyId values.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      opportunityId: z
        .number()
        .optional()
        .describe('Opportunity ID (required for update and delete)'),
      fields: opportunityFields
        .optional()
        .describe('Opportunity fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().optional().describe('ID of the affected opportunity'),
      message: z.string().optional().describe('Status message'),
      opportunity: z.any().optional().describe('Full opportunity record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating an opportunity');
      }
      let result = await client.createOpportunity(ctx.input.fields);
      let opportunityId = result?.id;
      let opportunity = opportunityId ? await client.getOpportunity(opportunityId) : result;
      return {
        output: { opportunityId, message: 'Opportunity created successfully', opportunity },
        message: `Created opportunity **${ctx.input.fields.reference || opportunityId}** (ID: ${opportunityId})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.opportunityId) {
        throw new Error('opportunityId is required for updating an opportunity');
      }
      await client.updateOpportunity(ctx.input.opportunityId, ctx.input.fields || {});
      let opportunity = await client.getOpportunity(ctx.input.opportunityId);
      return {
        output: {
          opportunityId: ctx.input.opportunityId,
          message: 'Opportunity updated successfully',
          opportunity
        },
        message: `Updated opportunity ID **${ctx.input.opportunityId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.opportunityId) {
        throw new Error('opportunityId is required for deleting an opportunity');
      }
      await client.deleteOpportunity(ctx.input.opportunityId);
      return {
        output: {
          opportunityId: ctx.input.opportunityId,
          message: 'Opportunity deleted successfully'
        },
        message: `Deleted opportunity ID **${ctx.input.opportunityId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
