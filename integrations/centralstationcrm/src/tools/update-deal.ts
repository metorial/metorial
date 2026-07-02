import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal in CentralStationCRM. Modify the name, value, target date, state, or responsible user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal to update'),
      dealName: z.string().optional().describe('Updated deal name'),
      value: z.string().optional().describe('Updated monetary value'),
      valueType: z
        .enum(['total', 'monthly', 'hourly', 'daily'])
        .optional()
        .describe('Updated billing type'),
      targetDate: z.string().optional().describe('Updated target date (YYYY-MM-DD)'),
      valueCount: z.string().optional().describe('Updated quantity metric'),
      currentState: z
        .enum(['0', '25', '50', '75', 'won', 'lost'])
        .optional()
        .describe('Updated deal state'),
      responsibleUserId: z.number().optional().describe('ID of the new responsible user')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the updated deal'),
      dealName: z.string().optional().describe('Deal name'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.dealName !== undefined) data.name = ctx.input.dealName;
    if (ctx.input.value !== undefined) data.value = ctx.input.value;
    if (ctx.input.valueType !== undefined) data.value_type = ctx.input.valueType;
    if (ctx.input.targetDate !== undefined) data.target_date = ctx.input.targetDate;
    if (ctx.input.valueCount !== undefined) data.value_count = ctx.input.valueCount;
    if (ctx.input.currentState !== undefined) data.current_state = ctx.input.currentState;
    if (ctx.input.responsibleUserId !== undefined) data.user_id = ctx.input.responsibleUserId;

    let result = await client.updateDeal(ctx.input.dealId, data);
    let deal = result?.deal ?? result;

    return {
      output: {
        dealId: deal.id,
        dealName: deal.name,
        updatedAt: deal.updated_at
      },
      message: `Updated deal **${deal.name}** (ID: ${deal.id}).`
    };
  })
  .build();
