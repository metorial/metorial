import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOpportunity = SlateTool.create(spec, {
  name: 'Create Opportunity',
  key: 'create_opportunity',
  description: `Create a new sales opportunity in Salesflare. An account is required. Set stage, value, currency, close date, probability, tags, lead source, recurring revenue, and custom fields.`,
  instructions: [
    'The **accountId** field is required. Look up or create the account first if needed.',
    'Use **stageId** to set the pipeline stage. List stages or pipelines to find valid IDs.',
    'For recurring revenue, set **recurringPricePerUnit**, **frequency**, and **units**.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('Account ID (required)'),
      name: z.string().optional().describe('Opportunity name'),
      ownerId: z.number().optional().describe('Owner user ID'),
      stageId: z.number().optional().describe('Pipeline stage ID'),
      value: z.number().optional().describe('Opportunity value'),
      currencyId: z
        .number()
        .optional()
        .describe('Currency ID (use List Currencies to find IDs)'),
      closeDate: z.string().optional().describe('Expected close date (ISO 8601)'),
      probability: z.number().optional().describe('Win probability (0-100)'),
      assigneeId: z.number().optional().describe('Assignee user ID'),
      mainContactId: z.number().optional().describe('Main contact ID'),
      tags: z.array(z.string()).optional().describe('Tag names to assign'),
      startDate: z.string().optional().describe('Opportunity start date (ISO 8601)'),
      recurringPricePerUnit: z.number().optional().describe('Recurring price per unit'),
      frequency: z
        .enum(['daily', 'weekly', 'monthly', 'annually'])
        .optional()
        .describe('Recurring revenue frequency'),
      units: z.number().optional().describe('Number of units'),
      contractStartDate: z.string().optional().describe('Contract start date (ISO 8601)'),
      contractEndDate: z.string().optional().describe('Contract end date (ISO 8601)'),
      custom: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the created opportunity'),
      opportunity: z.record(z.string(), z.any()).describe('Created opportunity data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {
      account: ctx.input.accountId
    };
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.ownerId) data.owner = ctx.input.ownerId;
    if (ctx.input.stageId) data.stage = ctx.input.stageId;
    if (ctx.input.value !== undefined) data.value = ctx.input.value;
    if (ctx.input.currencyId) data.currency = ctx.input.currencyId;
    if (ctx.input.closeDate) data.close_date = ctx.input.closeDate;
    if (ctx.input.probability !== undefined) data.probability = ctx.input.probability;
    if (ctx.input.assigneeId) data.assignee = ctx.input.assigneeId;
    if (ctx.input.mainContactId) data.main_contact = ctx.input.mainContactId;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.startDate) data.start_date = ctx.input.startDate;
    if (ctx.input.recurringPricePerUnit !== undefined)
      data.recurring_price_per_unit = ctx.input.recurringPricePerUnit;
    if (ctx.input.frequency) data.frequency = ctx.input.frequency;
    if (ctx.input.units !== undefined) data.units = ctx.input.units;
    if (ctx.input.contractStartDate) data.contract_start_date = ctx.input.contractStartDate;
    if (ctx.input.contractEndDate) data.contract_end_date = ctx.input.contractEndDate;
    if (ctx.input.custom) data.custom = ctx.input.custom;

    let result = await client.createOpportunity(data);
    let opportunityId = result.id ?? 0;

    return {
      output: {
        opportunityId,
        opportunity: result
      },
      message: `Created opportunity **${ctx.input.name || opportunityId}** (ID: ${opportunityId}).`
    };
  })
  .build();
