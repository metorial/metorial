import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve detailed information about a specific deal by its ID, including associated people, company, custom fields, and stage information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.number().describe('ID of the deal to retrieve')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('Unique deal ID'),
      name: z.string().describe('Deal name'),
      summary: z.string().nullable().optional().describe('Brief description'),
      value: z.number().nullable().optional().describe('Monetary value'),
      currency: z.string().nullable().optional().describe('Currency code'),
      probability: z.number().nullable().optional().describe('Win probability percentage'),
      expectedCloseDate: z.string().nullable().optional().describe('Expected close date'),
      actualCloseDate: z.string().nullable().optional().describe('Actual close date'),
      dealStageId: z.number().nullable().optional().describe('Current pipeline stage ID'),
      status: z.any().nullable().optional().describe('Deal status'),
      userId: z.number().nullable().optional().describe('Owner user ID'),
      companyId: z.number().nullable().optional().describe('Associated company ID'),
      companyName: z.string().nullable().optional().describe('Associated company name'),
      primaryContactId: z.number().nullable().optional().describe('Primary contact person ID'),
      sourceId: z.number().nullable().optional().describe('Lead source ID'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom field values'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let deal = await client.getDeal(ctx.input.dealId);

    return {
      output: {
        dealId: deal.id,
        name: deal.name,
        summary: deal.summary ?? null,
        value: deal.value ?? null,
        currency: deal.currency ?? null,
        probability: deal.probability ?? null,
        expectedCloseDate: deal.expected_close_date ?? null,
        actualCloseDate: deal.actual_close_date ?? null,
        dealStageId: deal.deal_stage_id ?? deal.stage_id ?? null,
        status: deal.status ?? null,
        userId: deal.user_id ?? null,
        companyId: deal.company_id ?? deal.company?.id ?? null,
        companyName: deal.company?.name ?? null,
        primaryContactId: deal.primary_contact_id ?? null,
        sourceId: deal.source_id ?? deal.source?.id ?? null,
        customFields: deal.custom_fields ?? null,
        createdAt: deal.created_at ?? null,
        updatedAt: deal.updated_at ?? null
      },
      message: `Retrieved deal **${deal.name}**${deal.value ? ` (value: ${deal.value})` : ''}`
    };
  })
  .build();
