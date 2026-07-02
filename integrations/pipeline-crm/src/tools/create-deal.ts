import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal (sales opportunity) in Pipeline CRM. Deals can be associated with people and companies, assigned to users, and placed in specific pipeline stages. If a company name is provided and no matching company exists, a new company will be created automatically.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the deal'),
      summary: z.string().optional().describe('Brief description of the deal'),
      value: z.number().optional().describe('Monetary value of the deal'),
      currency: z.string().optional().describe('Currency code (e.g., "USD")'),
      dealStageId: z.number().optional().describe('Pipeline stage ID for the deal'),
      probability: z.number().optional().describe('Win probability percentage (0-100)'),
      expectedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      userId: z.number().optional().describe('Owner user ID to assign the deal to'),
      companyId: z.number().optional().describe('Associated company ID'),
      companyName: z
        .string()
        .optional()
        .describe('Company name to associate. Creates a new company if no match is found'),
      primaryContactId: z.number().optional().describe('Primary contact person ID'),
      sourceId: z.number().optional().describe('Lead source ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by custom_label_<id>')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the created deal'),
      name: z.string().describe('Name of the deal'),
      summary: z.string().nullable().optional().describe('Brief description'),
      value: z.number().nullable().optional().describe('Monetary value'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let dealData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.summary !== undefined) dealData.summary = ctx.input.summary;
    if (ctx.input.value !== undefined) dealData.value = ctx.input.value;
    if (ctx.input.currency !== undefined) dealData.currency = ctx.input.currency;
    if (ctx.input.dealStageId !== undefined) dealData.deal_stage_id = ctx.input.dealStageId;
    if (ctx.input.probability !== undefined) dealData.probability = ctx.input.probability;
    if (ctx.input.expectedCloseDate !== undefined)
      dealData.expected_close_date = ctx.input.expectedCloseDate;
    if (ctx.input.userId !== undefined) dealData.user_id = ctx.input.userId;
    if (ctx.input.companyId !== undefined) dealData.company_id = ctx.input.companyId;
    if (ctx.input.companyName !== undefined) dealData.company_name = ctx.input.companyName;
    if (ctx.input.primaryContactId !== undefined)
      dealData.primary_contact_id = ctx.input.primaryContactId;
    if (ctx.input.sourceId !== undefined) dealData.source_id = ctx.input.sourceId;
    if (ctx.input.customFields !== undefined) dealData.custom_fields = ctx.input.customFields;

    let deal = await client.createDeal(dealData);

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        summary: deal.summary ?? null,
        value: deal.value ?? null,
        createdAt: deal.created_at ?? null
      },
      message: `Created deal **${deal.name}**${deal.value ? ` with value ${deal.value}` : ''}`
    };
  })
  .build();
