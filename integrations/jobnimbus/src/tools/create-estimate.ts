import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { financialItemPayload, financialItemSchema } from '../lib/financial-items';
import { spec } from '../spec';

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create an estimate using JobNimbus's documented legacy estimate API. Supply a related contact or job, a numeric status, and line items.`
})
  .input(
    z.object({
      parentRecordId: z
        .string()
        .describe('The contact or job ID to associate this estimate with'),
      parentRecordType: z
        .enum(['contact', 'job'])
        .optional()
        .describe('Type of the related record'),
      status: z.number().int().optional().describe('Required numeric estimate status code'),
      items: z.array(financialItemSchema).optional().describe('Required estimate line items'),
      statusName: z.string().optional().describe('Estimate status name'),
      recordTypeName: z.string().optional().describe('Record type name'),
      customerNote: z.string().optional().describe('Customer-facing note'),
      internalNote: z.string().optional().describe('Internal note (not visible to customer)'),
      salesRep: z.string().optional().describe('Sales rep user ID'),
      dateStart: z.number().optional().describe('Start date as Unix timestamp'),
      dateEnd: z.number().optional().describe('End date as Unix timestamp')
    })
  )
  .output(
    z.object({
      estimateId: z.string().describe('Unique JobNimbus ID of the created estimate'),
      number: z.string().optional().describe('Estimate number'),
      statusName: z.string().optional().describe('Estimate status'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.status === undefined || !ctx.input.items?.length) {
      throw createApiServiceError(
        'Provide a numeric status and at least one item to create an estimate.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      type: 'estimate',
      is_active: true,
      status: ctx.input.status,
      related: [{ id: ctx.input.parentRecordId, type: ctx.input.parentRecordType }],
      items: ctx.input.items.map(financialItemPayload)
    };

    if (ctx.input.statusName) data.status_name = ctx.input.statusName;
    if (ctx.input.recordTypeName) data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.customerNote) data.note = ctx.input.customerNote;
    if (ctx.input.internalNote) data.internal_note = ctx.input.internalNote;
    if (ctx.input.salesRep) data.sales_rep = ctx.input.salesRep;
    if (ctx.input.dateStart !== undefined) data.date_estimate = ctx.input.dateStart;
    if (ctx.input.dateEnd !== undefined) data.date_end = ctx.input.dateEnd;

    let result = await client.createEstimate(data);

    return {
      output: {
        estimateId: result.jnid,
        number: result.number,
        statusName: result.status_name,
        dateCreated: result.date_created
      },
      message: `Created estimate **${result.number || result.jnid}** for record ${ctx.input.parentRecordId}.`
    };
  })
  .build();
