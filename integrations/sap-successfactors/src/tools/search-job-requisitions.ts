import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchJobRequisitions = SlateTool.create(spec, {
  name: 'Search Job Requisitions',
  key: 'search_job_requisitions',
  description: `Search and list job requisitions in SAP SuccessFactors Recruiting. Filter by status, department, hiring manager, recruiter, or any other requisition attribute. Returns requisition details including title, status, location, and number of openings.`,
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
          'OData $filter expression (e.g., "status eq \'Open\'" or "department eq \'Engineering\'")'
        ),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z
        .string()
        .optional()
        .describe(
          'Navigation properties to expand (e.g., "jobApplications,hiringManagerName")'
        ),
      top: z.number().optional().describe('Maximum number of records').default(50),
      skip: z.number().optional().describe('Number of records to skip'),
      orderBy: z.string().optional().describe('Sort order (e.g., "openDate desc")')
    })
  )
  .output(
    z.object({
      requisitions: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of job requisition records'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let result = await client.queryJobRequisitions({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      top: ctx.input.top,
      skip: ctx.input.skip,
      orderBy: ctx.input.orderBy,
      inlineCount: true
    });

    return {
      output: {
        requisitions: result.results,
        totalCount: result.count
      },
      message: `Found **${result.results.length}** job requisitions${result.count !== undefined ? ` (${result.count} total)` : ''}`
    };
  })
  .build();
