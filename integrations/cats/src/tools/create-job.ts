import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

    let body: Record<string, any> = {
      title: ctx.input.title
    };

    if (ctx.input.orderId) body.order_id = ctx.input.orderId;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isActive !== undefined) body.is_active = ctx.input.isActive;
    if (ctx.input.companyId) body.company_id = ctx.input.companyId;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.postalCode) body.postal_code = ctx.input.postalCode;
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.salary) body.salary = ctx.input.salary;
    if (ctx.input.duration) body.duration = ctx.input.duration;
    if (ctx.input.startDate) body.start_date = ctx.input.startDate;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;
    if (ctx.input.openings) body.openings = ctx.input.openings;
    if (ctx.input.type) body.type = ctx.input.type;

    let result = await client.createJob(body);
    let jobId = result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';

    return {
      output: {
        jobId,
        title: ctx.input.title
      },
      message: `Created job **${ctx.input.title}** (ID: ${jobId}).`
    };
  })
  .build();
