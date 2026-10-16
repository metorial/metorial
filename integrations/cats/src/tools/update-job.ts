import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateJob = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Update an existing job order. Only provide fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to update'),
      title: z.string().optional().describe('Job title'),
      companyId: z.number().optional().describe('Company ID from search_companies'),
      orderId: z.string().optional().describe('Order/requisition ID'),
      description: z.string().optional().describe('Job description'),
      notes: z.string().optional().describe('Internal notes'),
      ownerId: z.number().optional().describe('Recruiter/owner user ID'),
      isActive: z.boolean().optional().describe('Whether active'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      countryCode: z.string().optional().describe('Country code'),
      salary: z.string().optional().describe('Salary'),
      duration: z.string().optional().describe('Duration'),
      startDate: z.string().optional().describe('Start date (RFC 3339)'),
      isHot: z.boolean().optional().describe('Mark as hot'),
      openings: z.number().optional().describe('Number of openings'),
      type: z.string().optional().describe('Job type')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the updated job'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.companyId !== undefined) body.company_id = ctx.input.companyId;
    if (ctx.input.title !== undefined) body.title = ctx.input.title;
    if (ctx.input.orderId !== undefined) body.external_id = ctx.input.orderId;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.ownerId !== undefined) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isActive !== undefined)
      throw createApiServiceError(
        'CATS job activity is controlled by workflow statuses; isActive cannot be written directly. Use change_job_status with a status from list_job_statuses.'
      );
    if (
      ctx.input.city !== undefined ||
      ctx.input.state !== undefined ||
      ctx.input.postalCode !== undefined
    ) {
      body.location = {
        city: ctx.input.city,
        state: ctx.input.state,
        postal_code: ctx.input.postalCode
      };
    }
    if (ctx.input.countryCode !== undefined) body.country_code = ctx.input.countryCode;
    if (ctx.input.salary !== undefined) body.salary = ctx.input.salary;
    if (ctx.input.duration !== undefined) body.duration = ctx.input.duration;
    if (ctx.input.startDate !== undefined) body.start_date = ctx.input.startDate;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;
    if (ctx.input.openings !== undefined) body.openings = ctx.input.openings;
    if (ctx.input.type !== undefined) body.type = ctx.input.type;

    await client.updateJob(ctx.input.jobId, body);

    return {
      output: {
        jobId: ctx.input.jobId,
        updated: true
      },
      message: `Updated job **${ctx.input.jobId}**.`
    };
  })
  .build();
