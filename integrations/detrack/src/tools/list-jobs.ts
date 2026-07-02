import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Lists delivery and collection jobs with optional filters. Supports filtering by date, driver, status, and job type. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().optional().describe('Filter by job date in YYYY-MM-DD format'),
      type: z.enum(['Delivery', 'Collection']).optional().describe('Filter by job type'),
      assignTo: z.string().optional().describe('Filter by assigned driver/vehicle name'),
      status: z
        .string()
        .optional()
        .describe('Filter by job status (e.g., info_received, dispatched, completed, failed)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().optional().describe('Detrack-assigned job ID'),
            doNumber: z.string().describe('Delivery order number'),
            date: z.string().describe('Job date'),
            type: z.string().optional().describe('Job type'),
            status: z.string().optional().describe('Job status'),
            assignTo: z.string().optional().describe('Assigned driver'),
            address: z.string().optional().describe('Job address'),
            deliverTo: z.string().optional().describe('Recipient/sender name')
          })
        )
        .describe('List of jobs'),
      total: z.number().describe('Total number of jobs matching the filter'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let result = await client.listJobs({
      date: ctx.input.date,
      type: ctx.input.type,
      assign_to: ctx.input.assignTo,
      status: ctx.input.status,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let jobs = result.jobs.map(j => ({
      jobId: j.id ? String(j.id) : undefined,
      doNumber: String(j.do_number ?? ''),
      date: String(j.date ?? ''),
      type: j.type ? String(j.type) : undefined,
      status: j.status ? String(j.status) : undefined,
      assignTo: j.assign_to ? String(j.assign_to) : undefined,
      address: j.address ? String(j.address) : undefined,
      deliverTo: j.deliver_to_collect_from ? String(j.deliver_to_collect_from) : undefined
    }));

    return {
      output: {
        jobs,
        total: result.total,
        page: result.page
      },
      message: `Found **${result.total}** job(s) (page ${result.page}). Showing ${jobs.length} result(s).`
    };
  })
  .build();
