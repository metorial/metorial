import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal (sales opportunity) in CentralStationCRM. Set the deal name, value, billing type, target date, and current state to track expected income and sales progress.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealName: z.string().describe('Name of the deal'),
      value: z.string().describe('Monetary value of the deal'),
      valueType: z
        .enum(['total', 'monthly', 'hourly', 'daily'])
        .describe('Billing type for the deal value'),
      targetDate: z.string().describe('Target date for winning the deal (YYYY-MM-DD)'),
      valueCount: z
        .string()
        .optional()
        .describe('Quantity metric, relevant if valueType is not "total"'),
      currentState: z
        .enum(['0', '25', '50', '75', 'won', 'lost'])
        .optional()
        .describe('Current state of the deal as probability percentage or outcome'),
      responsibleUserId: z
        .number()
        .optional()
        .describe('ID of the user responsible for this deal')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the created deal'),
      dealName: z.string().optional().describe('Name of the deal'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.createDeal({
      name: ctx.input.dealName,
      value: ctx.input.value,
      value_type: ctx.input.valueType,
      target_date: ctx.input.targetDate,
      value_count: ctx.input.valueCount,
      current_state: ctx.input.currentState,
      user_id: ctx.input.responsibleUserId
    });

    let deal = result?.deal ?? result;

    return {
      output: {
        dealId: deal.id,
        dealName: deal.name,
        createdAt: deal.created_at
      },
      message: `Created deal **${ctx.input.dealName}** (ID: ${deal.id}) with value ${ctx.input.value} (${ctx.input.valueType}).`
    };
  })
  .build();
