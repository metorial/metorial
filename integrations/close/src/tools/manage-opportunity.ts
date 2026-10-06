import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, customFields, validateDate } from '../lib/client';
import { mapOpportunity } from '../lib/models';
import { spec } from '../spec';

export let manageOpportunity = SlateTool.create(spec, {
  name: 'Manage Opportunity',
  key: 'manage_opportunity',
  description: `Create a new opportunity or update an existing one in Close CRM.
When creating: provide at least a leadId to associate the opportunity with.
When updating: provide the opportunityId along with any fields to change.`,
  instructions: [
    'To create a new opportunity, omit opportunityId and provide at least a leadId.',
    'To update an existing opportunity, provide the opportunityId along with the fields to change.',
    'The value field is in cents (e.g. 10000 = $100.00).',
    'Confidence is a percentage from 0 to 100.'
  ]
})
  .input(
    z.object({
      opportunityId: z
        .string()
        .optional()
        .describe('Opportunity ID to update. Omit to create a new opportunity.'),
      leadId: z
        .string()
        .optional()
        .describe('Lead ID to associate the opportunity with (required when creating)'),
      statusId: z.string().optional().describe('Status ID for the opportunity'),
      confidence: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Confidence percentage (0-100)'),
      value: z.number().optional().describe('Monetary value in cents'),
      valuePeriod: z
        .enum(['one_time', 'monthly', 'annual'])
        .optional()
        .describe('Value period for recurring deals'),
      pipelineId: z.string().optional().describe('Pipeline ID to place the opportunity in'),
      note: z.string().optional().describe('Note or description for the opportunity'),
      dateWon: z
        .string()
        .optional()
        .describe('Date the opportunity was won (ISO 8601 date string)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      opportunityId: z.string().describe('Opportunity ID'),
      leadId: z.string().describe('Associated lead ID'),
      statusId: z.string().describe('Status ID'),
      statusLabel: z.string().optional().describe('Human-readable status label'),
      statusType: z.string().optional().describe('Status type (active, won, or lost)'),
      confidence: z.number().describe('Confidence percentage'),
      value: z.number().optional().describe('Monetary value in cents'),
      valuePeriod: z.string().describe('Value period (one_time, monthly, or annual)'),
      pipelineId: z.string().optional().describe('Pipeline ID'),
      note: z.string().optional().describe('Opportunity note'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last update timestamp'),
      dateWon: z.string().nullable().describe('Date the opportunity was won'),
      userId: z.string().describe('ID of the user who owns the opportunity')
    })
  )
  .handleInvocation(async ctx => {
    const { opportunityId, ...fields } = ctx.input;
    if (opportunityId === undefined && fields.leadId === undefined)
      throw createApiServiceError('leadId is required when creating an opportunity.');
    if (fields.confidence !== undefined && !Number.isInteger(fields.confidence))
      throw createApiServiceError('confidence must be an integer from 0 to 100.');
    if (fields.value !== undefined && !Number.isSafeInteger(fields.value))
      throw createApiServiceError('value must be an integer number of cents.');
    validateDate(fields.dateWon, 'dateWon');
    const body = pickDefined({
      lead_id: fields.leadId,
      status_id: fields.statusId,
      confidence: fields.confidence,
      value: fields.value,
      value_period: fields.valuePeriod,
      pipeline_id: fields.pipelineId,
      note: fields.note,
      date_won: fields.dateWon,
      ...customFields(fields.customFields)
    });
    const client = new Client(ctx.auth);
    const opportunity =
      opportunityId !== undefined
        ? await client.updateOpportunity(opportunityId, body)
        : await client.createOpportunity(body);
    return {
      output: mapOpportunity(opportunity),
      message: `${opportunityId !== undefined ? 'Updated' : 'Created'} opportunity **${opportunity.id}**.`
    };
  })
  .build();
