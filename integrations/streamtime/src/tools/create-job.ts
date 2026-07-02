import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job (project) in Streamtime. Jobs are the central entity for tracking work, budgets, and deliverables. You can assign the job to a company, contact, and lead user, set a budget, and configure initial details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the job/project'),
      companyId: z.number().optional().describe('ID of the company this job is for'),
      contactId: z.number().optional().describe('ID of the contact person for this job'),
      jobLeadUserId: z.number().optional().describe('ID of the user who leads this job'),
      budget: z
        .string()
        .optional()
        .describe('Budget amount for the job as a string (e.g. "5000.00")'),
      number: z
        .string()
        .optional()
        .describe('Custom job number. Auto-generated if not provided.')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('ID of the newly created job'),
      name: z.string().describe('Name of the job'),
      number: z.string().optional().describe('Job number'),
      raw: z.record(z.string(), z.any()).describe('Full job object as returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.companyId !== undefined) {
      body.company = { id: ctx.input.companyId };
    }
    if (ctx.input.contactId !== undefined) {
      body.contact = { id: ctx.input.contactId };
    }
    if (ctx.input.jobLeadUserId !== undefined) {
      body.jobLeadUserId = ctx.input.jobLeadUserId;
    }
    if (ctx.input.budget !== undefined) {
      body.budget = ctx.input.budget;
    }
    if (ctx.input.number !== undefined) {
      body.number = ctx.input.number;
    }

    let result = await client.createJob(body);

    return {
      output: {
        jobId: result.id,
        name: result.name,
        number: result.number,
        raw: result
      },
      message: `Created job **${result.name}**${result.number ? ` (#${result.number})` : ''} with ID ${result.id}.`
    };
  })
  .build();
