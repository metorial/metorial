import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let createJob = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Create a new job order in CATS. Set the title, description, salary, location, company association, department, and other job details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Job title'),
      orderId: z.string().optional().describe('Requisition/order ID'),
      description: z.string().optional().describe('Job description (HTML supported)'),
      notes: z.string().optional().describe('Internal notes'),
      ownerId: z.number().optional().describe('Recruiter/owner user ID'),
      isActive: z.boolean().optional().describe('Whether the job is active'),
      companyId: z.number().optional().describe('Associated company ID'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      countryCode: z.string().optional().describe('ISO 3166 country code'),
      salary: z.string().optional().describe('Salary or salary range'),
      duration: z.string().optional().describe('Duration of the position'),
      startDate: z.string().optional().describe('Start date (RFC 3339)'),
      isHot: z.boolean().optional().describe('Mark as hot job'),
      openings: z.number().optional().describe('Number of openings'),
      type: z.string().optional().describe('Job type (e.g., full-time, contract)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the created job'),
      title: z.string().optional().describe('Job title')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      ctx.input.companyId === undefined ||
      (ctx.input.city === undefined &&
        ctx.input.state === undefined &&
        ctx.input.postalCode === undefined)
    )
      throw createApiServiceError(
        'CATS requires companyId and a location. Discover a company with search_companies and provide city, state, or postalCode.'
      );

    let body: Record<string, any> = {
      title: ctx.input.title
    };

    if (ctx.input.orderId !== undefined) body.external_id = ctx.input.orderId;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.ownerId !== undefined) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isActive !== undefined)
      throw createApiServiceError(
        'CATS job activity is controlled by workflow statuses; isActive cannot be written directly. Use change_job_status with a status from list_job_statuses.'
      );
    if (ctx.input.companyId !== undefined) body.company_id = ctx.input.companyId;
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

    let result = await client.createJob(body);
    let jobId = requiredId(result?.id, 'created record');

    return {
      output: {
        jobId,
        title: ctx.input.title
      },
      message: `Created job **${ctx.input.title}** (ID: ${jobId}).`
    };
  })
  .build();
