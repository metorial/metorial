import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOpportunities = SlateTool.create(spec, {
  name: 'Manage Opportunities',
  key: 'manage_opportunities',
  description: `Create, update, or delete Opportunity records in EspoCRM. Opportunities represent potential sales deals that are tracked through a configurable pipeline.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      opportunityId: z
        .string()
        .optional()
        .describe('Opportunity ID (required for update and delete)'),
      name: z.string().optional().describe('Opportunity name'),
      stage: z
        .string()
        .optional()
        .describe(
          'Sales stage (e.g., Prospecting, Qualification, Proposal, Closed Won, Closed Lost)'
        ),
      amount: z.number().optional().describe('Opportunity amount'),
      amountCurrency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
      probability: z.number().optional().describe('Win probability percentage (0-100)'),
      closeDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      accountId: z.string().optional().describe('ID of the associated Account'),
      contactId: z.string().optional().describe('ID of the primary Contact'),
      description: z.string().optional().describe('Description or notes'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      leadSource: z.string().optional().describe('Source of the opportunity'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      opportunityId: z.string().describe('ID of the opportunity'),
      name: z.string().optional().describe('Opportunity name'),
      stage: z.string().optional().describe('Sales stage'),
      amount: z.number().optional().describe('Amount'),
      amountCurrency: z.string().optional().describe('Currency'),
      probability: z.number().optional().describe('Win probability'),
      closeDate: z.string().optional().describe('Expected close date'),
      accountId: z.string().optional().describe('Associated Account ID'),
      accountName: z.string().optional().describe('Associated Account name'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, opportunityId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Opportunity', data);
      return {
        output: {
          opportunityId: result.id,
          name: result.name ?? undefined,
          stage: result.stage ?? undefined,
          amount: result.amount ?? undefined,
          amountCurrency: result.amountCurrency ?? undefined,
          probability: result.probability ?? undefined,
          closeDate: result.closeDate ?? undefined,
          accountId: result.accountId ?? undefined,
          accountName: result.accountName ?? undefined,
          createdAt: result.createdAt ?? undefined,
          modifiedAt: result.modifiedAt ?? undefined
        },
        message: `Opportunity **${result.name || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!opportunityId) throw createApiServiceError('opportunityId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Opportunity', opportunityId, data);
      return {
        output: {
          opportunityId: result.id,
          name: result.name ?? undefined,
          stage: result.stage ?? undefined,
          amount: result.amount ?? undefined,
          amountCurrency: result.amountCurrency ?? undefined,
          probability: result.probability ?? undefined,
          closeDate: result.closeDate ?? undefined,
          accountId: result.accountId ?? undefined,
          accountName: result.accountName ?? undefined,
          createdAt: result.createdAt ?? undefined,
          modifiedAt: result.modifiedAt ?? undefined
        },
        message: `Opportunity **${result.name || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!opportunityId) throw createApiServiceError('opportunityId is required for delete');
      await client.deleteRecord('Opportunity', opportunityId);
      return {
        output: {
          opportunityId
        },
        message: `Opportunity **${opportunityId}** deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
