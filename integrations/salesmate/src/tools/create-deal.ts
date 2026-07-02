import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal in a Salesmate pipeline. Deals represent sales opportunities and progress through pipeline stages. They can be linked to contacts and companies.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Deal title (required)'),
      owner: z.number().describe('User ID of the deal owner'),
      primaryContact: z.number().describe('ID of the primary contact for this deal'),
      pipeline: z.string().describe('Pipeline name (must match a configured pipeline)'),
      status: z.string().describe('Deal status (e.g., "Open", "Won", "Lost")'),
      stage: z
        .string()
        .describe('Pipeline stage name (must match a stage in the selected pipeline)'),
      currency: z.string().describe('Currency code (e.g., "USD")'),
      primaryCompany: z.number().optional().describe('ID of the primary company'),
      dealValue: z.number().optional().describe('Monetary value of the deal'),
      estimatedCloseDate: z
        .string()
        .optional()
        .describe('Expected close date (YYYY-MM-DD format)'),
      source: z.string().optional().describe('Deal source (e.g., "Ads", "Referral")'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., "High", "Medium", "Low")'),
      description: z.string().optional().describe('Deal description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      followers: z
        .array(z.number())
        .optional()
        .describe('Array of user IDs who should follow this deal'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the created deal')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createDeal(data);
    let dealId = result?.Data?.id;

    return {
      output: { dealId },
      message: `Deal **${ctx.input.title}** created with ID \`${dealId}\`.`
    };
  })
  .build();
