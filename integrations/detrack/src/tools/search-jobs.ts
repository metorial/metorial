import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let searchJobsTool = SlateTool.create(spec, {
  name: 'Search Jobs',
  key: 'search_jobs',
  description: `Searches for jobs across dates using various criteria such as date range, driver, status, tracking number, order number, and customer. Useful for looking up jobs when you don't know the exact date or D.O. number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z
        .string()
        .optional()
        .describe('Start date for the search range in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date for the search range in YYYY-MM-DD format'),
      doNumber: z.string().optional().describe('Filter by delivery order number'),
      trackingNumber: z.string().optional().describe('Filter by tracking number'),
      orderNumber: z.string().optional().describe('Filter by order number'),
      type: z.enum(['Delivery', 'Collection']).optional().describe('Filter by job type'),
      assignTo: z.string().optional().describe('Filter by assigned driver/vehicle name'),
      status: z.string().optional().describe('Filter by job status'),
      customer: z.string().optional().describe('Filter by customer name'),
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
            deliverTo: z.string().optional().describe('Recipient/sender name'),
            trackingNumber: z.string().optional().describe('Tracking number'),
            orderNumber: z.string().optional().describe('Order number'),
            customer: z.string().optional().describe('Customer name')
          })
        )
        .describe('List of matching jobs'),
      total: z.number().describe('Total number of matching jobs'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let result = await client.searchJobs({
      from: ctx.input.from,
      to: ctx.input.to,
      do_number: ctx.input.doNumber,
      tracking_number: ctx.input.trackingNumber,
      order_number: ctx.input.orderNumber,
      type: ctx.input.type,
      assign_to: ctx.input.assignTo,
      status: ctx.input.status,
      customer: ctx.input.customer,
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
      deliverTo: j.deliver_to_collect_from ? String(j.deliver_to_collect_from) : undefined,
      trackingNumber: j.tracking_number ? String(j.tracking_number) : undefined,
      orderNumber: j.order_number ? String(j.order_number) : undefined,
      customer: j.customer ? String(j.customer) : undefined
    }));

    return {
      output: {
        jobs,
        total: result.total,
        page: result.page
      },
      message: `Search found **${result.total}** job(s) (page ${result.page}). Showing ${jobs.length} result(s).`
    };
  })
  .build();
