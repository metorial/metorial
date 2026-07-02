import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDeal = SlateTool.create(spec, {
  name: 'Manage Deal',
  key: 'manage_deal',
  description: `Create, update, or upsert a deal in Freshsales.
Deals represent sales opportunities and can be associated with contacts and accounts. Manage pipeline stages and expected close dates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.number().optional().describe('ID of the deal to update. Omit to create.'),
      uniqueIdentifier: z
        .record(z.string(), z.any())
        .optional()
        .describe('Unique identifier for upsert'),
      name: z.string().optional().describe('Deal name'),
      amount: z.number().optional().describe('Deal value/amount'),
      expectedClose: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      dealStageId: z.number().optional().describe('Deal stage ID'),
      dealPipelineId: z.number().optional().describe('Deal pipeline ID'),
      dealTypeId: z.number().optional().describe('Deal type ID'),
      dealReasonId: z.number().optional().describe('Win/loss reason ID'),
      probability: z.number().optional().describe('Win probability percentage (0-100)'),
      ownerId: z.number().optional().describe('Assigned user ID'),
      salesAccountId: z.number().optional().describe('Associated account ID'),
      currencyId: z.number().optional().describe('Currency ID'),
      campaignId: z.number().optional().describe('Source campaign ID'),
      leadSourceId: z.number().optional().describe('Lead source ID'),
      territoryId: z.number().optional().describe('Territory ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the deal'),
      name: z.string().nullable().optional(),
      amount: z.number().nullable().optional(),
      expectedClose: z.string().nullable().optional(),
      dealStageId: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let dealData: Record<string, any> = {};
    if (ctx.input.name !== undefined) dealData.name = ctx.input.name;
    if (ctx.input.amount !== undefined) dealData.amount = ctx.input.amount;
    if (ctx.input.expectedClose !== undefined)
      dealData.expected_close = ctx.input.expectedClose;
    if (ctx.input.dealStageId !== undefined) dealData.deal_stage_id = ctx.input.dealStageId;
    if (ctx.input.dealPipelineId !== undefined)
      dealData.deal_pipeline_id = ctx.input.dealPipelineId;
    if (ctx.input.dealTypeId !== undefined) dealData.deal_type_id = ctx.input.dealTypeId;
    if (ctx.input.dealReasonId !== undefined) dealData.deal_reason_id = ctx.input.dealReasonId;
    if (ctx.input.probability !== undefined) dealData.probability = ctx.input.probability;
    if (ctx.input.ownerId !== undefined) dealData.owner_id = ctx.input.ownerId;
    if (ctx.input.salesAccountId !== undefined)
      dealData.sales_account_id = ctx.input.salesAccountId;
    if (ctx.input.currencyId !== undefined) dealData.currency_id = ctx.input.currencyId;
    if (ctx.input.campaignId !== undefined) dealData.campaign_id = ctx.input.campaignId;
    if (ctx.input.leadSourceId !== undefined) dealData.lead_source_id = ctx.input.leadSourceId;
    if (ctx.input.territoryId !== undefined) dealData.territory_id = ctx.input.territoryId;
    if (ctx.input.customFields) dealData.custom_field = ctx.input.customFields;

    let deal: Record<string, any>;
    let action: string;

    if (ctx.input.dealId) {
      deal = await client.updateDeal(ctx.input.dealId, dealData);
      action = 'updated';
    } else if (ctx.input.uniqueIdentifier) {
      deal = await client.upsertDeal(ctx.input.uniqueIdentifier, dealData);
      action = 'upserted';
    } else {
      deal = await client.createDeal(dealData);
      action = 'created';
    }

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        amount: deal.amount,
        expectedClose: deal.expected_close,
        dealStageId: deal.deal_stage_id,
        ownerId: deal.owner_id,
        createdAt: deal.created_at,
        updatedAt: deal.updated_at
      },
      message: `Deal **${deal.name || deal.id}** ${action} successfully.`
    };
  })
  .build();
