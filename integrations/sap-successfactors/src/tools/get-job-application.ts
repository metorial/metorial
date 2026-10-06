import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/helpers';
import { spec } from '../spec';

export let getJobApplication = SlateTool.create(spec, {
  name: 'Get Job Application',
  key: 'get_job_application',
  description: `Retrieve a specific job application by its ID, or search job applications with filtering. Returns application details including candidate info, status, requisition, and applied date. Can optionally expand candidate and requisition navigation properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.number().optional().describe('Specific application ID to retrieve'),
      filter: z
        .string()
        .optional()
        .describe(
          'OData $filter expression for searching applications (e.g., "jobReqId eq 12345")'
        ),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z
        .string()
        .optional()
        .describe(
          'Navigation properties to expand; discover exact tenant names with get_api_metadata'
        ),
      top: z
        .number()
        .optional()
        .describe('Maximum records to return when searching')
        .default(50),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      application: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single application record (when applicationId is provided)'),
      applications: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of applications (when searching)'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.applicationId !== undefined) {
      if (
        ctx.input.filter !== undefined ||
        ctx.input.skip !== undefined ||
        ctx.input.nextPage !== undefined ||
        ctx.input.top !== 50
      )
        throw invalid(
          'A keyed read cannot use search filters or pagination. Omit the ID to search.'
        );
      let application = await client.getJobApplication(ctx.input.applicationId, {
        select: ctx.input.select,
        expand: ctx.input.expand
      });
      return {
        output: { application },
        message: `Retrieved job application **#${ctx.input.applicationId}**`
      };
    }

    let result = await client.queryJobApplications({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: true
    });

    return {
      output: {
        applications: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Found **${result.results.length}** job applications`
    };
  })
  .build();
