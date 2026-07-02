import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateOpportunity = SlateTool.create(spec, {
  name: 'Update Opportunity',
  key: 'update_opportunity',
  description: `Update an existing sales opportunity in Salesflare. Modify stage, value, close date, probability, tags, recurring revenue settings, and custom fields. Set **done** to mark an opportunity as won or lost.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      opportunityId: z.number().describe('ID of the opportunity to update'),
      name: z.string().optional().describe('Updated opportunity name'),
      ownerId: z.number().optional().describe('Updated owner user ID'),
      stageId: z.number().optional().describe('Updated pipeline stage ID'),
      value: z.number().optional().describe('Updated opportunity value'),
      currencyId: z.number().optional().describe('Updated currency ID'),
      closeDate: z.string().optional().describe('Updated close date (ISO 8601)'),
      probability: z.number().optional().describe('Updated win probability (0-100)'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      mainContactId: z.number().optional().describe('Updated main contact ID'),
      accountId: z.number().optional().describe('Updated account ID'),
      tags: z.array(z.string()).optional().describe('Updated tag names'),
      closed: z.boolean().optional().describe('Whether the opportunity is closed'),
      done: z.boolean().optional().describe('Whether the opportunity is done (won/lost)'),
      lostReasonId: z.number().optional().describe('Lost reason ID (when marking as lost)'),
      leadSourceId: z.number().optional().describe('Lead source ID'),
      recurringPricePerUnit: z
        .number()
        .optional()
        .describe('Updated recurring price per unit'),
      frequency: z
        .enum(['daily', 'weekly', 'monthly', 'annually'])
        .optional()
        .describe('Updated recurring frequency'),
      units: z.number().optional().describe('Updated number of units'),
      contractStartDate: z
        .string()
        .optional()
        .describe('Updated contract start date (ISO 8601)'),
      contractEndDate: z.string().optional().describe('Updated contract end date (ISO 8601)'),
      custom: z.record(z.string(), z.any()).optional().describe('Updated custom field values')
    })
  )
  .output(
    z.object({
      opportunity: z.record(z.string(), z.any()).describe('Updated opportunity data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.ownerId !== undefined) data.owner = ctx.input.ownerId;
    if (ctx.input.stageId !== undefined) data.stage = ctx.input.stageId;
    if (ctx.input.value !== undefined) data.value = ctx.input.value;
    if (ctx.input.currencyId !== undefined) data.currency = ctx.input.currencyId;
    if (ctx.input.closeDate !== undefined) data.close_date = ctx.input.closeDate;
    if (ctx.input.probability !== undefined) data.probability = ctx.input.probability;
    if (ctx.input.assigneeId !== undefined) data.assignee = ctx.input.assigneeId;
    if (ctx.input.mainContactId !== undefined) data.main_contact = ctx.input.mainContactId;
    if (ctx.input.accountId !== undefined) data.account = ctx.input.accountId;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.closed !== undefined) data.closed = ctx.input.closed;
    if (ctx.input.done !== undefined) data.done = ctx.input.done;
    if (ctx.input.lostReasonId !== undefined) data.lost_reason = ctx.input.lostReasonId;
    if (ctx.input.leadSourceId !== undefined) data.lead_source = ctx.input.leadSourceId;
    if (ctx.input.recurringPricePerUnit !== undefined)
      data.recurring_price_per_unit = ctx.input.recurringPricePerUnit;
    if (ctx.input.frequency !== undefined) data.frequency = ctx.input.frequency;
    if (ctx.input.units !== undefined) data.units = ctx.input.units;
    if (ctx.input.contractStartDate !== undefined)
      data.contract_start_date = ctx.input.contractStartDate;
    if (ctx.input.contractEndDate !== undefined)
      data.contract_end_date = ctx.input.contractEndDate;
    if (ctx.input.custom !== undefined) data.custom = ctx.input.custom;

    let result = await client.updateOpportunity(ctx.input.opportunityId, data);

    return {
      output: { opportunity: result },
      message: `Updated opportunity **${ctx.input.opportunityId}**.`
    };
  })
  .build();
