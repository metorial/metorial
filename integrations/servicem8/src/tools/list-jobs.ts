import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let jobSchema = z.object({
  jobUuid: z.string().describe('Unique identifier for the job'),
  generatedJobId: z.string().optional().describe('Human-readable auto-generated job number'),
  status: z
    .string()
    .optional()
    .describe('Job status: Quote, Work Order, Completed, or Unsuccessful'),
  description: z.string().optional().describe('Job description or scope of work'),
  jobAddress: z.string().optional().describe('Address where the job takes place'),
  billingAddress: z.string().optional().describe('Billing address for the job'),
  companyUuid: z.string().optional().describe('UUID of the associated client/company'),
  categoryUuid: z.string().optional().describe('UUID of the job category'),
  date: z.string().optional().describe('Job date (YYYY-MM-DD HH:MM:SS)'),
  dueDate: z.string().optional().describe('Due date for the job'),
  totalPrice: z.string().optional().describe('Total price of the job'),
  poNumber: z.string().optional().describe("Customer's purchase order number"),
  active: z.number().optional().describe('1 = active, 0 = deleted'),
  editDate: z.string().optional().describe('Timestamp when the record was last modified')
});

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List and filter jobs from ServiceM8. Supports OData-style filtering on fields like **status**, **company_uuid**, **active**, and **total_price**. Returns all matching jobs with their details including status, address, description, and pricing.`,
  instructions: [
    'Use the filter parameter with OData syntax, e.g. "status eq \'Work Order\' and active eq 1"',
    'Valid status values: Quote, Work Order, Completed, Unsuccessful',
    'Combine up to 10 filter conditions with "and"'
  ],
  constraints: [
    'Maximum 10 filter conditions per request',
    'Rate limit: 180 requests/minute, 20,000/day'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe(
          'OData-style filter expression, e.g. "status eq \'Work Order\' and active eq 1"'
        )
    })
  )
  .output(
    z.object({
      jobs: z.array(jobSchema).describe('List of matching jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let jobs = await client.listJobs({ filter: ctx.input.filter });

    let mapped = jobs.map((j: any) => ({
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
      active: j.active,
      editDate: j.edit_date
    }));

    return {
      output: { jobs: mapped },
      message: `Found **${mapped.length}** job(s)${ctx.input.filter ? ` matching filter: \`${ctx.input.filter}\`` : ''}.`
    };
  })
  .build();
