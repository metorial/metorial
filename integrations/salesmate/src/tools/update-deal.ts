import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal in Salesmate. Use this to change deal stage, status, value, or any other field. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to update'),
      title: z.string().optional().describe('Deal title'),
      owner: z.number().optional().describe('User ID of the deal owner'),
      primaryContact: z.number().optional().describe('ID of the primary contact'),
      primaryCompany: z.number().optional().describe('ID of the primary company'),
      pipeline: z.string().optional().describe('Pipeline name'),
      status: z.string().optional().describe('Deal status (e.g., "Open", "Won", "Lost")'),
      stage: z.string().optional().describe('Pipeline stage name'),
      currency: z.string().optional().describe('Currency code'),
      dealValue: z.number().optional().describe('Monetary value of the deal'),
      estimatedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      source: z.string().optional().describe('Deal source'),
      priority: z.string().optional().describe('Priority level'),
      description: z.string().optional().describe('Deal description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      followers: z
        .array(z.number())
        .optional()
        .describe('User IDs who should follow this deal'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the updated deal')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { dealId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateDeal(dealId, updateData);

    return {
      output: { dealId },
      message: `Deal \`${dealId}\` updated successfully.`
    };
  })
  .build();
