import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createSalesOpportunity = SlateTool.create(spec, {
  name: 'Create Sales Opportunity',
  key: 'create_sales_opportunity',
  description: `Create a new sales opportunity in Firmao's sales pipeline. Track potential deals with customer linkage, value, currency, stage, and acquisition method.`
})
  .input(
    z.object({
      label: z.string().describe('Opportunity name (required)'),
      currency: z.string().describe('Currency code (e.g., PLN, EUR, USD) (required)'),
      customerId: z.number().optional().describe('Associated customer ID'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      acquisitionMethod: z
        .string()
        .optional()
        .describe('Acquisition method (e.g., MARKETING_CAMPAIGN)'),
      sellingProcess: z.string().optional().describe('Selling process (e.g., DEFAULT)'),
      salesDate: z.string().optional().describe('Expected sales date (YYYY-MM-DD)'),
      salesOpportunityValue: z.number().optional().describe('Estimated deal value'),
      stage: z.string().optional().describe('Sales stage identifier'),
      emails: z.array(z.string()).optional().describe('Contact email addresses'),
      phones: z.array(z.string()).optional().describe('Contact phone numbers'),
      tagIds: z.array(z.number()).optional().describe('Tag IDs')
    })
  )
  .output(
    z.object({
      salesOpportunityId: z.number().describe('ID of the created opportunity'),
      label: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      label: ctx.input.label,
      currency: ctx.input.currency
    };

    if (ctx.input.customerId !== undefined) body.customer = ctx.input.customerId;
    if (ctx.input.responsibleUserId !== undefined)
      body.responsibleUser = ctx.input.responsibleUserId;
    if (ctx.input.acquisitionMethod) body.acquisitionMethod = ctx.input.acquisitionMethod;
    if (ctx.input.sellingProcess) body.sellingProcess = ctx.input.sellingProcess;
    if (ctx.input.salesDate) body.salesDate = ctx.input.salesDate;
    if (ctx.input.salesOpportunityValue !== undefined)
      body.salesOpportunityValue = ctx.input.salesOpportunityValue;
    if (ctx.input.stage) body.stage = ctx.input.stage;
    if (ctx.input.emails) body.emails = ctx.input.emails;
    if (ctx.input.phones) body.phones = ctx.input.phones;
    if (ctx.input.tagIds) body.tags = ctx.input.tagIds.map(id => ({ id }));

    let result = await client.create('salesopportunities', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        salesOpportunityId: createdId,
        label: ctx.input.label
      },
      message: `Created sales opportunity **${ctx.input.label}** (ID: ${createdId}).`
    };
  })
  .build();
