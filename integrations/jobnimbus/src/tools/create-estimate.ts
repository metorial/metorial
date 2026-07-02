import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate in JobNimbus. Estimates are associated with a contact or job and can include customer notes, internal notes, and a status.`
})
  .input(
    z.object({
      parentRecordId: z
        .string()
        .describe('The contact or job ID to associate this estimate with'),
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
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      primary: ctx.input.parentRecordId
    };

    if (ctx.input.statusName) data.status_name = ctx.input.statusName;
    if (ctx.input.recordTypeName) data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.customerNote) data.customer_note = ctx.input.customerNote;
    if (ctx.input.internalNote) data.internal_note = ctx.input.internalNote;
    if (ctx.input.salesRep) data.sales_rep = ctx.input.salesRep;
    if (ctx.input.dateStart) data.date_start = ctx.input.dateStart;
    if (ctx.input.dateEnd) data.date_end = ctx.input.dateEnd;

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
