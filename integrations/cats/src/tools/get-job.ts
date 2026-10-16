import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve a single job order by ID. Returns full job details including title, description, salary, location, and company association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to retrieve')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID'),
      title: z.string().optional().describe('Job title'),
      orderId: z.string().optional().describe('Order/requisition ID'),
      description: z.string().optional().describe('Job description'),
      notes: z.string().optional().describe('Internal notes'),
      isActive: z.boolean().optional().describe('Whether active'),
      isHot: z.boolean().optional().describe('Whether hot'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      postalCode: z.string().optional().describe('Postal code'),
      countryCode: z.string().optional().describe('Country code'),
      salary: z.string().optional().describe('Salary'),
      duration: z.string().optional().describe('Duration'),
      startDate: z.string().optional().describe('Start date'),
      openings: z.number().optional().describe('Number of openings'),
      type: z.string().optional().describe('Job type'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date'),
      raw: z.any().optional().describe('Complete provider response, retaining null values'),
      links: z.any().optional().describe('HAL links for related resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: requiredId(data?.id, 'record'),
        title: data.title ?? undefined,
        orderId: data.external_id ?? undefined,
        description: data.description ?? undefined,
        notes: data.notes ?? undefined,
        isActive: data.is_active ?? undefined,
        isHot: data.is_hot ?? undefined,
        city: data.location?.city ?? undefined,
        state: data.location?.state ?? undefined,
        postalCode: data.location?.postal_code ?? undefined,
        countryCode: data.country_code ?? undefined,
        salary: data.salary ?? undefined,
        duration: data.duration ?? undefined,
        startDate: data.start_date ?? undefined,
        openings: data.openings ?? undefined,
        type: data.type ?? undefined,
        createdAt: data.date_created ?? undefined,
        updatedAt: data.date_modified ?? undefined,
        raw: data,
        links: data._links
      },
      message: `Retrieved job **${data.title ?? ctx.input.jobId}** (ID: ${ctx.input.jobId}).`
    };
  })
  .build();
