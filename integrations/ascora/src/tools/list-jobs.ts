import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraClient } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description:
    'Search a page of Ascora jobs by status, customer, assigned user, job type, creation date or text. Use a returned job number with get_job for full details.',
  instructions: [
    'Ascora defaults to open jobs, page 1 and 250 records per page when those filters are omitted.',
    'Set jobStatus to ALL to include jobs regardless of status.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterText: z.string().optional().describe('Partial job number, name or address'),
      jobStatus: z
        .enum([
          'NEW',
          'IN-PROGRESS',
          'COMPLETED',
          'CANCELLED',
          'BOOKED',
          'ALL-OPEN',
          'PARTS-REQUIRING-REORDER',
          'COMPLETED-NOT-INVOICED',
          'READY-TO-INVOICE',
          'CLOSED',
          'REATTENDANCE-REQUIRED',
          'INCOMPLETE',
          'COMPLETED-OR-CLOSED',
          'ALL'
        ])
        .optional()
        .describe('Job status filter; omitted uses Ascora’s open-job default'),
      jobType: z.string().optional().describe('Job type name'),
      assignedUser: z.string().optional().describe('Full name of the assigned user'),
      customerName: z.string().optional().describe('Partial site or billing customer name'),
      includeChildJobs: z.boolean().optional().describe('Include job sections and stages'),
      startDate: z.string().optional().describe('Include jobs created on or after this date'),
      endDate: z.string().optional().describe('Include jobs created on or before this date'),
      page: z.number().int().min(1).optional().describe('Page number; defaults to 1'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Records per page; defaults to 250')
    })
  )
  .output(
    z.object({
      jobs: z.array(z.any()).describe('Job records matching the requested filters'),
      count: z.number().describe('Number of jobs returned in this page'),
      totalPages: z.number().optional().describe('Total result pages when reported by Ascora'),
      totalRecords: z
        .number()
        .optional()
        .describe('Total matching jobs when reported by Ascora')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AscoraClient(ctx.auth).listJobs(ctx.input);
    return {
      output: { ...result, count: result.jobs.length },
      message: `Retrieved **${result.jobs.length}** job(s) from Ascora.`
    };
  })
  .build();
