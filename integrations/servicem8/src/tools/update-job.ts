import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Update an existing job in ServiceM8. Modify any combination of fields including status, description, address, pricing, and client association. Only the provided fields will be updated.`,
  instructions: [
    'Only include fields you want to change',
    'Valid status values: Quote, Work Order, Completed, Unsuccessful'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobUuid: z.string().describe('UUID of the job to update'),
      status: z
        .enum(['Quote', 'Work Order', 'Completed', 'Unsuccessful'])
        .optional()
        .describe('New job status'),
      description: z.string().optional().describe('Updated description or scope of work'),
      jobAddress: z.string().optional().describe('Updated job address'),
      billingAddress: z.string().optional().describe('Updated billing address'),
      companyUuid: z.string().optional().describe('UUID of client/company to associate'),
      categoryUuid: z.string().optional().describe('UUID of the job category'),
      date: z.string().optional().describe('Updated job date (YYYY-MM-DD HH:MM:SS)'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      poNumber: z.string().optional().describe('Updated customer purchase order number'),
      workDoneDescription: z.string().optional().describe('Description of work completed')
    })
  )
  .output(
    z.object({
      jobUuid: z.string().describe('UUID of the updated job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.jobAddress !== undefined) data.job_address = ctx.input.jobAddress;
    if (ctx.input.billingAddress !== undefined)
      data.billing_address = ctx.input.billingAddress;
    if (ctx.input.companyUuid) data.company_uuid = ctx.input.companyUuid;
    if (ctx.input.categoryUuid) data.category_uuid = ctx.input.categoryUuid;
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
    if (ctx.input.poNumber !== undefined) data.po_number = ctx.input.poNumber;
    if (ctx.input.workDoneDescription !== undefined)
      data.work_done_description = ctx.input.workDoneDescription;

    await client.updateJob(ctx.input.jobUuid, data);

    return {
      output: { jobUuid: ctx.input.jobUuid },
      message: `Updated job **${ctx.input.jobUuid}**. Changed fields: ${Object.keys(data).join(', ')}.`
    };
  })
  .build();
