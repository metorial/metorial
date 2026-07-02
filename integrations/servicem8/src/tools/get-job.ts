import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve a single job by UUID with all its details including status, address, description, pricing, and associated client information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobUuid: z.string().describe('UUID of the job to retrieve')
    })
  )
  .output(
    z.object({
      jobUuid: z.string().describe('Unique identifier for the job'),
      generatedJobId: z
        .string()
        .optional()
        .describe('Human-readable auto-generated job number'),
      status: z
        .string()
        .optional()
        .describe('Job status: Quote, Work Order, Completed, or Unsuccessful'),
      description: z.string().optional().describe('Job description or scope of work'),
      jobAddress: z.string().optional().describe('Address where the job takes place'),
      billingAddress: z.string().optional().describe('Billing address for the job'),
      companyUuid: z.string().optional().describe('UUID of the associated client/company'),
      categoryUuid: z.string().optional().describe('UUID of the job category'),
      date: z.string().optional().describe('Job date'),
      dueDate: z.string().optional().describe('Due date for the job'),
      totalPrice: z.string().optional().describe('Total price of the job'),
      poNumber: z.string().optional().describe("Customer's purchase order number"),
      workDoneDescription: z.string().optional().describe('Description of work done'),
      completionDate: z.string().optional().describe('Date when the job was completed'),
      active: z.number().optional().describe('1 = active, 0 = deleted'),
      editDate: z.string().optional().describe('Timestamp when the record was last modified'),
      badges: z.string().optional().describe('JSON array of badge UUIDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let j = await client.getJob(ctx.input.jobUuid);

    return {
      output: {
        jobUuid: j.uuid,
        generatedJobId: j.generated_job_id,
        status: j.status,
        description: j.description,
        jobAddress: j.job_address,
        billingAddress: j.billing_address,
        companyUuid: j.company_uuid,
        categoryUuid: j.category_uuid,
        date: j.date,
        dueDate: j.due_date,
        totalPrice: j.total_price,
        poNumber: j.po_number,
        workDoneDescription: j.work_done_description,
        completionDate: j.completion_date,
        active: j.active,
        editDate: j.edit_date,
        badges: j.badges
      },
      message: `Retrieved job **${j.generated_job_id || j.uuid}** (status: ${j.status || 'unknown'}).`
    };
  })
  .build();
