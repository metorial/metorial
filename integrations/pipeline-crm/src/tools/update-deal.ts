import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal in Pipeline CRM. Any provided fields will be updated; omitted fields remain unchanged. Supports updating core properties, associations, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal to update'),
      name: z.string().optional().describe('New deal name'),
      summary: z.string().optional().describe('Updated description'),
      value: z.number().optional().describe('Updated monetary value'),
      currency: z.string().optional().describe('Updated currency code'),
      dealStageId: z.number().optional().describe('New pipeline stage ID'),
      probability: z.number().optional().describe('Updated win probability (0-100)'),
      expectedCloseDate: z
        .string()
        .optional()
        .describe('Updated expected close date (YYYY-MM-DD)'),
      actualCloseDate: z
        .string()
        .optional()
        .describe('Actual close date when won/lost (YYYY-MM-DD)'),
      userId: z.number().optional().describe('New owner user ID'),
      companyId: z.number().optional().describe('New associated company ID'),
      companyName: z.string().optional().describe('Company name to associate'),
      primaryContactId: z.number().optional().describe('New primary contact person ID'),
      sourceId: z.number().optional().describe('Updated lead source ID'),
      lossReason: z.string().optional().describe('Reason for losing the deal'),
      lossReasonNotes: z
        .string()
        .optional()
        .describe('Additional notes about the loss reason'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom_label_<id>')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the updated deal'),
      name: z.string().describe('Updated deal name'),
      value: z.number().nullable().optional().describe('Monetary value'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let dealData: Record<string, any> = {};

    if (ctx.input.name !== undefined) dealData.name = ctx.input.name;
    if (ctx.input.summary !== undefined) dealData.summary = ctx.input.summary;
    if (ctx.input.value !== undefined) dealData.value = ctx.input.value;
    if (ctx.input.currency !== undefined) dealData.currency = ctx.input.currency;
    if (ctx.input.dealStageId !== undefined) dealData.deal_stage_id = ctx.input.dealStageId;
    if (ctx.input.probability !== undefined) dealData.probability = ctx.input.probability;
    if (ctx.input.expectedCloseDate !== undefined)
      dealData.expected_close_date = ctx.input.expectedCloseDate;
    if (ctx.input.actualCloseDate !== undefined)
      dealData.actual_close_date = ctx.input.actualCloseDate;
    if (ctx.input.userId !== undefined) dealData.user_id = ctx.input.userId;
    if (ctx.input.companyId !== undefined) dealData.company_id = ctx.input.companyId;
    if (ctx.input.companyName !== undefined) dealData.company_name = ctx.input.companyName;
    if (ctx.input.primaryContactId !== undefined)
      dealData.primary_contact_id = ctx.input.primaryContactId;
    if (ctx.input.sourceId !== undefined) dealData.source_id = ctx.input.sourceId;
    if (ctx.input.lossReason !== undefined) dealData.loss_reason = ctx.input.lossReason;
    if (ctx.input.lossReasonNotes !== undefined)
      dealData.loss_reason_notes = ctx.input.lossReasonNotes;
    if (ctx.input.customFields !== undefined) dealData.custom_fields = ctx.input.customFields;

    let deal = await client.updateDeal(ctx.input.dealId, dealData);

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        value: deal.value ?? null,
        updatedAt: deal.updated_at ?? null
      },
      message: `Updated deal **${deal.name}**`
    };
  })
  .build();
