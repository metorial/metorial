import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve a single deal by ID from Freshsales. Optionally include related contacts, account, stage, and activity data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal to retrieve'),
      include: z
        .array(
          z.enum([
            'sales_activities',
            'owner',
            'creater',
            'updater',
            'source',
            'contacts',
            'sales_account',
            'deal_stage',
            'deal_type',
            'deal_reason',
            'campaign',
            'deal_payment_status',
            'currency'
          ])
        )
        .optional()
        .describe('Related data to include')
    })
  )
  .output(
    z.object({
      dealId: z.number(),
      name: z.string().nullable().optional(),
      amount: z.number().nullable().optional(),
      expectedClose: z.string().nullable().optional(),
      closedDate: z.string().nullable().optional(),
      dealStageId: z.number().nullable().optional(),
      dealPipelineId: z.number().nullable().optional(),
      dealTypeId: z.number().nullable().optional(),
      dealReasonId: z.number().nullable().optional(),
      probability: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      salesAccountId: z.number().nullable().optional(),
      currencyId: z.number().nullable().optional(),
      customFields: z.record(z.string(), z.any()).nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let includeStr = ctx.input.include?.join(',');
    let deal = await client.getDeal(ctx.input.dealId, includeStr);

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        amount: deal.amount,
        expectedClose: deal.expected_close,
        closedDate: deal.closed_date,
        dealStageId: deal.deal_stage_id,
        dealPipelineId: deal.deal_pipeline_id,
        dealTypeId: deal.deal_type_id,
        dealReasonId: deal.deal_reason_id,
        probability: deal.probability,
        ownerId: deal.owner_id,
        salesAccountId: deal.sales_account_id,
        currencyId: deal.currency_id,
        customFields: deal.custom_field,
        createdAt: deal.created_at,
        updatedAt: deal.updated_at
      },
      message: `Retrieved deal **${deal.name || deal.id}**.`
    };
  })
  .build();
