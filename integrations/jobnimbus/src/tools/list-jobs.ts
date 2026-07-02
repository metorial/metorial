import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Search and list jobs (projects) in JobNimbus. Supports filtering by status, workflow type, contact, tags, and more. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statusName: z.string().optional().describe('Filter by workflow status name'),
      recordTypeName: z.string().optional().describe('Filter by workflow type name'),
      contactId: z
        .string()
        .optional()
        .describe('Filter by primary contact ID to get all jobs for a contact'),
      tag: z.string().optional().describe('Filter by tag'),
      from: z.number().optional().describe('Pagination offset (0-based). Defaults to 0.'),
      size: z
        .number()
        .optional()
        .describe('Number of results per page. Defaults to 25. Max 200.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching jobs'),
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique JobNimbus ID of the job'),
            name: z.string().optional().describe('Job name'),
            description: z.string().optional().describe('Job description'),
            number: z.string().optional().describe('Job number'),
            statusName: z.string().optional().describe('Current workflow status'),
            recordTypeName: z.string().optional().describe('Workflow type name'),
            addressLine1: z.string().optional().describe('Job site address'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            zip: z.string().optional().describe('Zip code'),
            primaryContactId: z.string().optional().describe('Primary contact ID'),
            primaryContactName: z.string().optional().describe('Primary contact name'),
            sourceName: z.string().optional().describe('Lead source'),
            tags: z.array(z.string()).optional().describe('Tags'),
            salesRepName: z.string().optional().describe('Sales rep name'),
            dateCreated: z.number().optional().describe('Unix timestamp of creation'),
            dateUpdated: z.number().optional().describe('Unix timestamp of last update')
          })
        )
        .describe('List of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mustClauses: any[] = [];

    if (ctx.input.statusName) {
      mustClauses.push({ term: { status_name: ctx.input.statusName } });
    }
    if (ctx.input.recordTypeName) {
      mustClauses.push({ term: { record_type_name: ctx.input.recordTypeName } });
    }
    if (ctx.input.contactId) {
      mustClauses.push({ term: { primary: ctx.input.contactId } });
    }
    if (ctx.input.tag) {
      mustClauses.push({ term: { tags: ctx.input.tag } });
    }

    let filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;

    let result = await client.listJobs({
      from: ctx.input.from,
      size: ctx.input.size,
      filter
    });

    let jobs = (result.results || []).map((j: any) => ({
      jobId: j.jnid,
      name: j.name,
      description: j.description,
      number: j.number,
      statusName: j.status_name,
      recordTypeName: j.record_type_name,
      addressLine1: j.address_line1,
      city: j.city,
      state: j.state_text,
      zip: j.zip,
      primaryContactId: j.primary,
      primaryContactName: j.primary_name,
      sourceName: j.source_name,
      tags: j.tags,
      salesRepName: j.sales_rep_name,
      dateCreated: j.date_created,
      dateUpdated: j.date_updated
    }));

    return {
      output: {
        totalCount: result.count || 0,
        jobs
      },
      message: `Found **${result.count || 0}** jobs. Returned ${jobs.length} results.`
    };
  })
  .build();
