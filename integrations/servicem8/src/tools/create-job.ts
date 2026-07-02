import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job in ServiceM8. Specify the job address, description, status, and optionally link it to a client (company). Returns the UUID of the newly created job.`,
  instructions: [
    'Valid status values: Quote, Work Order, Completed, Unsuccessful',
    'If no status is provided, ServiceM8 defaults to Quote',
    'Link a job to a client by providing the companyUuid'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      status: z
        .enum(['Quote', 'Work Order', 'Completed', 'Unsuccessful'])
        .optional()
        .describe('Job status'),
      description: z.string().optional().describe('Job description or scope of work'),
      jobAddress: z.string().optional().describe('Address where the job takes place'),
      billingAddress: z.string().optional().describe('Billing address for the job'),
      companyUuid: z
        .string()
        .optional()
        .describe('UUID of the client/company to associate with this job'),
      categoryUuid: z.string().optional().describe('UUID of the job category'),
      date: z.string().optional().describe('Job date (YYYY-MM-DD HH:MM:SS)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      poNumber: z.string().optional().describe("Customer's purchase order number")
    })
  )
  .output(
    z.object({
      jobUuid: z.string().describe('UUID of the newly created job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.jobAddress) data.job_address = ctx.input.jobAddress;
    if (ctx.input.billingAddress) data.billing_address = ctx.input.billingAddress;
    if (ctx.input.companyUuid) data.company_uuid = ctx.input.companyUuid;
    if (ctx.input.categoryUuid) data.category_uuid = ctx.input.categoryUuid;
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;

    let jobUuid = await client.createJob(data);

    return {
      output: { jobUuid },
      message: `Created new job with UUID **${jobUuid}**${ctx.input.status ? ` (status: ${ctx.input.status})` : ''}.`
    };
  })
  .build();
