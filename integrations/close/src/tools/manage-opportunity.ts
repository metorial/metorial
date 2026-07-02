import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      statusLabel: z.string().describe('Human-readable status label'),
      statusType: z.string().describe('Status type (active, won, or lost)'),
      confidence: z.number().describe('Confidence percentage'),
      value: z.number().describe('Monetary value in cents'),
      valuePeriod: z.string().describe('Value period (one_time, monthly, or annual)'),
      pipelineId: z.string().describe('Pipeline ID'),
      note: z.string().describe('Opportunity note'),
      dateCreated: z.string().describe('Creation timestamp'),
      dateUpdated: z.string().describe('Last update timestamp'),
      dateWon: z.string().nullable().describe('Date the opportunity was won'),
      userId: z.string().describe('ID of the user who owns the opportunity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let { opportunityId, ...fields } = ctx.input;
    let opportunity: any;

    let apiData: Record<string, any> = {};
    if (fields.leadId) apiData.lead_id = fields.leadId;
    if (fields.statusId) apiData.status_id = fields.statusId;
    if (fields.confidence !== undefined) apiData.confidence = fields.confidence;
    if (fields.value !== undefined) apiData.value = fields.value;
    if (fields.valuePeriod) apiData.value_period = fields.valuePeriod;
    if (fields.pipelineId) apiData.pipeline_id = fields.pipelineId;
    if (fields.note !== undefined) apiData.note = fields.note;
    if (fields.dateWon !== undefined) apiData.date_won = fields.dateWon;
    if (fields.customFields) {
      for (let [key, value] of Object.entries(fields.customFields)) {
        apiData[key] = value;
      }
    }

    if (opportunityId) {
      opportunity = await client.updateOpportunity(opportunityId, apiData);
    } else {
      if (!fields.leadId) {
        throw new Error('leadId is required when creating a new opportunity.');
      }
      opportunity = await client.createOpportunity(apiData);
    }

    return {
      output: {
        opportunityId: opportunity.id,
        leadId: opportunity.lead_id,
        statusId: opportunity.status_id,
        statusLabel: opportunity.status_label ?? '',
        statusType: opportunity.status_type ?? '',
        confidence: opportunity.confidence ?? 0,
        value: opportunity.value ?? 0,
        valuePeriod: opportunity.value_period ?? 'one_time',
        pipelineId: opportunity.pipeline_id ?? '',
        note: opportunity.note ?? '',
        dateCreated: opportunity.date_created,
        dateUpdated: opportunity.date_updated,
        dateWon: opportunity.date_won ?? null,
        userId: opportunity.user_id ?? ''
      },
      message: opportunityId
        ? `Updated opportunity **${opportunity.id}** (status: ${opportunity.status_label ?? opportunity.status_type}).`
        : `Created opportunity **${opportunity.id}** for lead **${opportunity.lead_id}** (status: ${opportunity.status_label ?? opportunity.status_type}).`
    };
  })
  .build();
