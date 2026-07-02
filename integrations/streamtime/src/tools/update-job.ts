import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Update an existing job's details such as name, budget, company, contact, and lead user. Can also update the job's status separately (e.g., mark as "In Play", "Completed", etc.).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.number().describe('ID of the job to update'),
      name: z.string().optional().describe('New name for the job'),
      companyId: z.number().optional().describe('New company ID for the job'),
      contactId: z.number().optional().describe('New contact ID for the job'),
      jobLeadUserId: z.number().optional().describe('New lead user ID for the job'),
      budget: z
        .string()
        .optional()
        .describe('New budget amount as a string (e.g. "10000.00")'),
      statusId: z
        .number()
        .optional()
        .describe('New job status ID. Use the search tool to find available statuses.')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('ID of the updated job'),
      name: z.string().describe('Name of the updated job'),
      raw: z.record(z.string(), z.any()).describe('Full updated job object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    if (ctx.input.statusId !== undefined) {
      await client.updateJobStatus(ctx.input.jobId, {
        id: ctx.input.statusId
      });
    }

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.companyId !== undefined) body.company = { id: ctx.input.companyId };
    if (ctx.input.contactId !== undefined) body.contact = { id: ctx.input.contactId };
    if (ctx.input.jobLeadUserId !== undefined) body.jobLeadUserId = ctx.input.jobLeadUserId;
    if (ctx.input.budget !== undefined) body.budget = ctx.input.budget;

    let result: any;
    if (Object.keys(body).length > 0) {
      result = await client.updateJob(ctx.input.jobId, body);
    } else {
      result = await client.getJob(ctx.input.jobId);
    }

    return {
      output: {
        jobId: result.id,
        name: result.name,
        raw: result
      },
      message: `Updated job **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
